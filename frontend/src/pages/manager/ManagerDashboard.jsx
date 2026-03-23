import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPendingRequests, getHighPriority, getApprovedList, getExceptions } from '../../api/managerApi'
import api from '../../api/axiosInstance'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ pending: 0, high: 0, approved: 0, exceptions: 0, pendingApprovals: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getPendingRequests(), getHighPriority(), getApprovedList(), getExceptions(),
      api.get('/procurement/supplier-approvals/pending')
    ]).then(([pending, high, approved, exc, pendingApprovals]) => {
      setStats({
        pending: pending.value?.data?.length || 0,
        high: high.value?.data?.length || 0,
        approved: approved.value?.data?.length || 0,
        exceptions: exc.value?.data?.length || 0,
        pendingApprovals: pendingApprovals.value?.data?.length || 0,
      })
    }).finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="section-title mb-1">Dashboard</p>
          <h1 className="page-title">Manager Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome, {user?.name}</p>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Pending PR',      value: stats.pending,    path: '/manager/pending',            alert: stats.pending > 0 },
              { label: 'High Priority',   value: stats.high,       path: '/manager/high-priority',      alert: stats.high > 0 },
              { label: 'Supplier Review', value: stats.pendingApprovals, path: '/manager/supplier-approvals', alert: stats.pendingApprovals > 0 },
              { label: 'Sent to Finance', value: stats.approved,   path: '/manager/approved' },
              { label: 'Exceptions',      value: stats.exceptions, path: '/manager/exceptions',         alert: stats.exceptions > 0 },
            ].map(s => (
              <Link key={s.label} to={s.path}
                className={`card hover:border-amber-800/40 transition-colors block ${s.alert ? 'border-amber-800/50' : ''}`}>
                <p className="section-title mb-2 text-xs truncate">{s.label}</p>
                <p className={`font-mono text-2xl font-medium ${s.alert ? 'text-amber-400' : 'text-slate-100'}`}>{s.value}</p>
              </Link>
            ))}
          </div>
        )}
        <div>
          <p className="section-title mb-3">Actions</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/manager/pending" className="btn-primary">Review Pending PRs</Link>
            <Link to="/manager/supplier-approvals" className="btn-primary flex items-center gap-2"><span>🏭</span> Review Supplier Selections</Link>
            <Link to="/manager/high-priority" className="btn-secondary">High Priority Queue</Link>
            <Link to="/manager/exceptions" className="btn-secondary">View Exceptions</Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
