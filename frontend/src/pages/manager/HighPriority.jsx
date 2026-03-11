import { useEffect, useState } from 'react'
import { getHighPriority } from '../../api/managerApi'
import AppLayout from '../../components/AppLayout'
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function HighPriority() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getHighPriority()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Manager</p>
          <h1 className="page-title">High Priority Requests</h1>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No high priority requests pending." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.pr_id} className="card border-red-900/30 hover:border-red-800/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">#{r.pr_id}</span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {r.department} · {r.quantity} units · ₹{parseFloat(r.total_amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-red-400 font-mono mt-1">
                      Required by: {new Date(r.required_by).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
