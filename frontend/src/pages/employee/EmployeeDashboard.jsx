import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getRequests } from '../../api/employeeApi'
import AppLayout from '../../components/AppLayout'
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState } from '../../components/Feedback'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRequests()
      .then(({ data }) => setRequests(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status.startsWith('PENDING')).length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
    delivered: requests.filter(r => r.status === 'DELIVERED').length,
  }

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <p className="section-title mb-1">Dashboard</p>
          <h1 className="page-title">Welcome back, {user?.name}</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Requests', value: stats.total },
            { label: 'In Progress', value: stats.pending },
            { label: 'Rejected', value: stats.rejected },
            { label: 'Delivered', value: stats.delivered },
          ].map((s) => (
            <div key={s.label} className="card">
              <p className="section-title mb-2">{s.label}</p>
              <p className="font-mono text-2xl text-slate-100 font-medium">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <p className="section-title mb-3">Quick Actions</p>

          <div className="flex flex-wrap gap-3">

            {/* 🤖 AI CHAT BUTTON (NEW) */}
            <Link to="/ai-chat" className="btn-primary">
              🤖 AI Request
            </Link>

            {/* Optional: keep manual form */}
            <Link to="/employee/new" className="btn-secondary">
              Manual Request
            </Link>

            <Link to="/employee/drafts" className="btn-secondary">
              View Drafts
            </Link>

          </div>
        </div>

        {/* Recent requests */}
        <div>
          <p className="section-title mb-3">Recent Requests</p>

          {loading ? (
            <LoadingSpinner />
          ) : requests.length === 0 ? (
            <EmptyState message="No requests yet. Create your first one." />
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 8).map((r) => (
                <div
                  key={r.pr_id}
                  className="card flex items-center justify-between hover:border-surface-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">
                      {r.item_name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {r.department} · {r.quantity} units · ₹
                      {parseFloat(r.total_amount).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}