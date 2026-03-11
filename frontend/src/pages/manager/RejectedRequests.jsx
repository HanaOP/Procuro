import { useEffect, useState } from 'react'
import { getRejectedList } from '../../api/managerApi'
import AppLayout from '../../components/AppLayout'
import { PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function ManagerRejected() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getRejectedList()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Manager</p>
          <h1 className="page-title">Rejected Requests</h1>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No rejected requests." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.pr_id} className="card border-red-900/20">
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
                    {r.manager_comment && (
                      <p className="mt-1.5 text-xs text-red-400 font-mono">Reason: {r.manager_comment}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-red-400 uppercase tracking-widest bg-red-950/30 border border-red-900/40 px-2 py-0.5 shrink-0">Rejected</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
