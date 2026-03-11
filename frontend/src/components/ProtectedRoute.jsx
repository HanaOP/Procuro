import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-slate-500 tracking-widest">LOADING</span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    // Redirect to their correct dashboard
    const dashboardMap = {
      EMPLOYEE: '/employee',
      MANAGER: '/manager',
      FINANCE: '/finance',
      PROCUREMENT: '/procurement',
      SUPPLIER: '/supplier',
    }
    return <Navigate to={dashboardMap[user.role] || '/login'} replace />
  }

  return children
}
