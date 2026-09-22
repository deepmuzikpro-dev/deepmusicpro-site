import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

function topSellers(orderItems, titleKey = 'title') {
  const counts = {}
  for (const item of orderItems) {
    const key = item[titleKey]
    if (!counts[key]) counts[key] = { title: key, count: 0, revenue: 0 }
    counts[key].count += 1
    counts[key].revenue += Number(item.unit_price)
  }
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [topTracks, setTopTracks] = useState([])
  const [topProducts, setTopProducts] = useState([])

  useEffect(() => {
    async function load() {
      const [{ count: trackCount }, { count: productCount }, { data: orders }, { data: paidItems }] = await Promise.all([
        supabase.from('tracks').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('subtotal, status').eq('status', 'paid'),
        supabase
          .from('order_items')
          .select('title, unit_price, item_type, orders!inner(status)')
          .eq('orders.status', 'paid'),
      ])
      const revenue = (orders || []).reduce((s, o) => s + Number(o.subtotal), 0)
      setStats({ trackCount, productCount, orderCount: orders?.length || 0, revenue })

      const items = paidItems || []
      setTopTracks(topSellers(items.filter((i) => i.item_type === 'track_license')))
      setTopProducts(topSellers(items.filter((i) => i.item_type === 'product')))
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Dashboard</h1>
      {!stats ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-4 mb-10">
            <div className="card p-4">
              <p className="text-dmp-white/50 text-xs mb-1">Tracks</p>
              <p className="font-display font-bold text-2xl text-dmp-green">{stats.trackCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-dmp-white/50 text-xs mb-1">Products</p>
              <p className="font-display font-bold text-2xl text-dmp-yellow">{stats.productCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-dmp-white/50 text-xs mb-1">Paid Orders</p>
              <p className="font-display font-bold text-2xl text-dmp-red">{stats.orderCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-dmp-white/50 text-xs mb-1">Revenue</p>
              <p className="font-display font-bold text-2xl">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h2 className="font-display font-bold text-lg mb-3">Top-Selling Licenses</h2>
              {topTracks.length === 0 ? (
                <p className="text-dmp-white/50 text-sm">No sales yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topTracks.map((t) => (
                    <div key={t.title} className="card p-3 flex items-center justify-between text-sm">
                      <span className="truncate">{t.title}</span>
                      <span className="text-dmp-green font-semibold shrink-0">{t.count}× · ${t.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg mb-3">Top-Selling Products</h2>
              {topProducts.length === 0 ? (
                <p className="text-dmp-white/50 text-sm">No sales yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topProducts.map((p) => (
                    <div key={p.title} className="card p-3 flex items-center justify-between text-sm">
                      <span className="truncate">{p.title}</span>
                      <span className="text-dmp-yellow font-semibold shrink-0">{p.count}× · ${p.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
