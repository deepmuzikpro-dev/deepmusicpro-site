import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const linkClass = ({ isActive }) =>
  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-dmp-green text-black' : 'text-dmp-white/70 hover:bg-white/5'
  }`

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth()

  if (loading) return <div className="px-6 py-10 text-dmp-white/50">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="font-display font-bold text-2xl mb-2">Admins only</h1>
        <p className="text-dmp-white/60">
          Your account doesn't have admin access. Ask an existing admin to set your role to
          "admin" in the profiles table.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid sm:grid-cols-[200px_1fr] gap-8">
      <aside className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
        <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
        <NavLink to="/admin/upload" className={linkClass}>Upload</NavLink>
        <NavLink to="/admin/tracks" className={linkClass}>Tracks</NavLink>
        <NavLink to="/admin/genres" className={linkClass}>Genres</NavLink>
        <NavLink to="/admin/products" className={linkClass}>Products</NavLink>
        <NavLink to="/admin/bundles" className={linkClass}>Bundles</NavLink>
        <NavLink to="/admin/orders" className={linkClass}>Orders</NavLink>
        <NavLink to="/admin/rewards" className={linkClass}>Rewards</NavLink>
        <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
        <NavLink to="/admin/affiliates" className={linkClass}>Affiliates</NavLink>
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  )
}
