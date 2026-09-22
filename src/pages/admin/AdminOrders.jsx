import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Orders</h1>
      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-dmp-white/50">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-sm">{o.email}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-dmp-white/50">{new Date(o.created_at).toLocaleString()}</span>
                  <span className={`badge ${o.status === 'paid' ? 'bg-dmp-green text-black' : o.status === 'failed' ? 'bg-dmp-red text-white' : 'bg-white/10 text-dmp-white/60'}`}>
                    {o.status}
                  </span>
                </div>
              </div>
              <ul className="text-sm text-dmp-white/70 list-disc list-inside mb-2">
                {o.order_items.map((i) => (
                  <li key={i.id}>{i.title} — ${Number(i.unit_price).toFixed(2)}</li>
                ))}
              </ul>
              <div className="flex justify-between text-sm">
                <span className="text-dmp-white/50">Points earned: {o.points_earned}</span>
                <span className="font-semibold">${Number(o.subtotal).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
