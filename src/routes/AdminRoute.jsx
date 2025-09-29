import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) return <div className="p-6">Loading…</div>

  // Must be authenticated AND role === 'admin'
  if (!user) return <Navigate to="/auth" replace />
  if (String(user.role).toLowerCase() !== 'admin') return <NoAccess />

  return <Outlet />
}

function NoAccess() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="text-7xl">🚫</div>
      <h1 className="mt-4 text-2xl font-bold text-brand-500">Access denied</h1>
      <p className="text-gray-400 mt-2">Admin role required.</p>
    </div>
  )
}
