import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient'
import { startConnectOnboarding, startPremiumSubscription, openBillingPortal } from '../lib/checkout'

function formatMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

export default function Sell() {
  const { user, profile, loading } = useAuth()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ trackCount: 0, productCount: 0, totalEarned: 0, pendingPayouts: 0 })
  const [affiliate, setAffiliate] = useState(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ count: trackCount }, { count: productCount }, { data: items }] = await Promise.all([
        supabase.from('tracks').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
        supabase.from('order_items').select('seller_payout_amount, payout_status').eq('seller_id', user.id),
      ])
      const totalEarned = (items || []).filter((i) => i.payout_status === 'paid').reduce((s, i) => s + Number(i.seller_payout_amount), 0)
      const pendingPayouts = (items || []).filter((i) => i.payout_status === 'pending').reduce((s, i) => s + Number(i.seller_payout_amount), 0)
      setStats({ trackCount: trackCount || 0, productCount: productCount || 0, totalEarned, pendingPayouts })

      const { data: tierRows } = await supabase.rpc('affiliate_tier_for', { p_user_id: user.id })
      const { data: commissions } = await supabase.from('affiliate_commissions').select('commission_amount, status').eq('referrer_id', user.id)
      const paidCommissions = (commissions || []).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0)
      const pendingCommissions = (commissions || []).filter((c) => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0)
      setAffiliate({ ...(tierRows?.[0] || { tier: 'affiliate', rate: 0.1, referral_count: 0 }), paidCommissions, pendingCommissions })
    }
    load()
  }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const isPremium = profile?.seller_tier === 'premium'
  const connected = !!profile?.stripe_connect_account_id
  const payoutsEnabled = !!profile?.stripe_connect_payouts_enabled
  const referralLink = profile?.referral_code ? `${window.location.origin}/signup?ref=${profile.referral_code}` : ''

  async function handleConnect() {
    setError('')
    setBusy('connect')
    try {
      await startConnectOnboarding({ userId: user.id, email: user.email })
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  async function handleUpgrade() {
    setError('')
    setBusy('upgrade')
    try {
      await startPremiumSubscription({ userId: user.id, email: user.email })
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  async function handlePortal() {
    setError('')
    setBusy('portal')
    try {
      await openBillingPortal({ userId: user.id })
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  const tierLabel = { affiliate: 'Affiliate', ambassador: 'Ambassador', grand_ambassador: 'Grand Ambassador' }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-1">Sell on Deepmusicpro</h1>
      <p className="text-dmp-white/60 mb-8">Run your own store inside Deepmusicpro — beats, ebooks, PDF guides, kits.</p>

      {params.get('connected') && (
        <p className="mb-6 text-sm text-dmp-green">Payout account connected — you're set up to get paid.</p>
      )}
      {params.get('upgraded') && (
        <p className="mb-6 text-sm text-dmp-green">You're on Premium now — 0% commission and a guaranteed featured slot each week.</p>
      )}
      {error && <p className="mb-6 text-sm text-dmp-red">{error}</p>}

      {/* Tier card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={`badge ${isPremium ? 'bg-dmp-yellow text-black' : 'bg-white/10 text-dmp-white/70'}`}>
              {isPremium ? 'Premium Seller' : 'Basic Seller'}
            </span>
            <p className="text-dmp-white/60 text-sm mt-2">
              {isPremium
                ? 'You keep 100% of every sale, and every new upload is featured for a week.'
                : 'Deepmusicpro takes an 8% commission at checkout — you keep 92%. Featured placement is earned organically by play count.'}
            </p>
          </div>
        </div>
        {isPremium ? (
          <button onClick={handlePortal} disabled={busy === 'portal'} className="btn-outline">
            {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
          </button>
        ) : (
          <button onClick={handleUpgrade} disabled={busy === 'upgrade'} className="btn-primary">
            {busy === 'upgrade' ? 'Starting…' : 'Upgrade to Premium — $9.99/mo'}
          </button>
        )}
      </div>

      {/* Payout account */}
      <div className="card p-6 mb-6">
        <h2 className="font-display font-bold text-lg mb-2">Payout account</h2>
        {payoutsEnabled ? (
          <p className="text-sm text-dmp-green">✓ Connected and ready to receive payouts.</p>
        ) : (
          <>
            <p className="text-sm text-dmp-white/60 mb-3">
              {connected
                ? 'Almost there — finish Stripe onboarding to start receiving payouts.'
                : "Connect a payout account (via Stripe) before you sell — it's how you get paid for every sale."}
            </p>
            <button onClick={handleConnect} disabled={busy === 'connect'} className="btn-primary">
              {busy === 'connect' ? 'Redirecting…' : connected ? 'Finish payout setup' : 'Connect payout account'}
            </button>
          </>
        )}
      </div>

      {/* Store stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-dmp-green">{stats.trackCount}</p>
          <p className="text-xs text-dmp-white/50">Tracks listed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-dmp-green">{stats.productCount}</p>
          <p className="text-xs text-dmp-white/50">Products listed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-dmp-yellow">{formatMoney(stats.totalEarned)}</p>
          <p className="text-xs text-dmp-white/50">Paid out</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-extrabold text-dmp-white/70">{formatMoney(stats.pendingPayouts)}</p>
          <p className="text-xs text-dmp-white/50">Pending payout</p>
        </div>
      </div>

      <div className="flex gap-3 mb-10">
        <Link to="/sell/upload" className="btn-primary">Upload something to sell</Link>
        <Link to="/sell/dashboard" className="btn-outline">Manage my store</Link>
      </div>

      {/* Affiliate program */}
      <div className="card p-6 border-dmp-yellow/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Affiliate program</h2>
          {affiliate && (
            <span className="badge bg-dmp-yellow text-black">{tierLabel[affiliate.tier]} · {Math.round(affiliate.rate * 100)}%</span>
          )}
        </div>
        <p className="text-sm text-dmp-white/60 mb-4">
          Earn cash every time someone you refer makes a purchase. Rates go up automatically the more
          members you bring in — Affiliate (10%) → Ambassador at 5+ referrals (15%) → Grand Ambassador at 20+ (20%).
        </p>
        {referralLink && (
          <div className="flex items-center gap-2 mb-4">
            <input className="input flex-1 text-sm" readOnly value={referralLink} onFocus={(e) => e.target.select()} />
            <button
              className="btn-outline !py-1.5 !px-3 text-sm shrink-0"
              onClick={() => navigator.clipboard?.writeText(referralLink)}
            >
              Copy
            </button>
          </div>
        )}
        {affiliate && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display font-bold text-lg">{affiliate.referral_count}</p>
              <p className="text-xs text-dmp-white/50">Members referred</p>
            </div>
            <div>
              <p className="font-display font-bold text-lg text-dmp-yellow">{formatMoney(affiliate.paidCommissions)}</p>
              <p className="text-xs text-dmp-white/50">Paid out</p>
            </div>
            <div>
              <p className="font-display font-bold text-lg text-dmp-white/70">{formatMoney(affiliate.pendingCommissions)}</p>
              <p className="text-xs text-dmp-white/50">Pending</p>
            </div>
          </div>
        )}
        {!payoutsEnabled && (
          <p className="text-xs text-dmp-white/40 mt-4">Connect a payout account above to receive affiliate commissions.</p>
        )}
      </div>
    </div>
  )
}
