import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRequests } from '../../api/employeeApi'
import AppLayout from '../../components/AppLayout'
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const navigate = useNavigate()

  useEffect(() => {
    getRequests()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const statuses = ['ALL', 'PENDING_MANAGER', 'PENDING_FINANCE', 'PENDING_PROCUREMENT', 'RFQ_SENT', 'SUPPLIER_SELECTED', 'DELIVERED', 'REJECTED']
  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title mb-1">Employee</p>
            <h1 className="page-title">My Requests</h1>
          </div>
          <button onClick={() => navigate('/employee/new')} className="btn-primary">+ New Request</button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {statuses.map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-all ${
                filter === s
                  ? 'bg-amber-500 text-surface-950'
                  : 'bg-surface-800 text-slate-500 hover:text-slate-300 border border-surface-700'
              }`}>
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? <EmptyState message="No requests found." /> : (
          <div className="space-y-2">
            {filtered.map(r => (
              <div key={r.pr_id} className="card hover:border-surface-600 transition-colors cursor-pointer"
                onClick={() => navigate(`/employee/requests/${r.pr_id}`)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">#{r.pr_id}</span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {r.department} · {r.quantity} × ₹{parseFloat(r.estimated_unit_price).toLocaleString()} · Total ₹{parseFloat(r.total_amount).toLocaleString()}
                    </p>
                    {r.manager_comment && (
                      <p className="mt-2 text-xs text-red-400 font-mono bg-red-950/20 border border-red-900/40 px-2 py-1">
                        ↳ {r.manager_comment}
                      </p>
                    )}
                    {r.clarification_message && (
                      <p className="mt-2 text-xs text-amber-400 font-mono bg-amber-950/20 border border-amber-900/40 px-2 py-1">
                        ↳ Clarification requested: {r.clarification_message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-slate-600 font-mono">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
