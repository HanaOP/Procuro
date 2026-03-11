import { useEffect, useState } from 'react'
import { getApprovedList } from '../../api/managerApi'
import AppLayout from '../../components/AppLayout'
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function ManagerApproved() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getApprovedList()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Manager</p>
          <h1 className="page-title">Approved Requests</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">Requests forwarded to Finance for budget approval</p>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No approved requests yet." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.pr_id} className="card hover:border-surface-600 transition-colors">
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
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-slate-600 font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
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
