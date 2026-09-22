import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const TIER_LABEL = { affiliate: 'Affiliate · 10%', ambassador: 'Ambassador · 15%', grand_ambassador: 'Grand Ambassador · 20%' }

export default function AdminAffiliates() {
  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState({ paid: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, referral_code')
        .not('referral_code', 'is', null)

      const { data: allCommissions } = await supabase
        .from('affiliate_commissions')
        .select('referrer_id, commission_amount, status')

      const byReferrer = {}
      for (const c of allCommissions || []) {
        byReferrer[c.referrer_id] = byReferrer[c.referrer_id] || { paid: 0, pending: 0 }
        if (c.status === 'paid') byReferrer[c.referrer_id].paid += Number(c.commission_amount)
        if (c.status === 'pending') byReferrer[c.referrer_id].pending += Number(c.commission_amount)
      }

      const enriched = await Promise.all(
        (profiles || []).map(async (p) => {
          const { data: tierRows } = await supabase.rpc('affiliate_tier_for', { p_user_id: p.id })
          const tier = tierRows?.[0]
          return {
            ...p,
            tier: tier?.tier || 'affiliate',
            referral_count: tier?.referral_count || 0,
            paid: byReferrer[p.id]?.paid || 0,
            pending: byReferrer[p.id]?.pending || 0,
          }
        })
      )

      const withReferrals = enriched.filter((r) => r.referral_count > 0).sort((a, b) => b.referral_count - a.referral_count)
      setRows(withReferrals)
      setTotals({
        paid: (allCommissions || []).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0),
        pending: (allCommissions || []).filter((c) => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0),
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-1">Affiliate Program</h1>
      <p className="text-dmp-white/50 mb-6">Members who bring in new members, ranked by referrals.</p>

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-dmp-yellow">${totals.paid.toFixed(2)}</p>
          <p className="text-xs text-dmp-white/50">Commissions paid</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-dmp-white/70">${totals.pending.toFixed(2)}</p>
          <p className="text-xs text-dmp-white/50">Pending (awaiting payout setup)</p>
        </div>
      </div>

      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-dmp-white/50">No one has referred a new member yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.id} className="card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{r.display_name || r.email}</p>
                <p className="text-xs text-dmp-white/50">{r.referral_count} referred · code {r.referral_code}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="badge bg-white/10 text-dmp-white/70">{TIER_LABEL[r.tier]}</span>
                <span className="text-sm text-dmp-yellow">${r.paid.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
