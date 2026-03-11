import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRejected } from '../../api/employeeApi'
import AppLayout from '../../components/AppLayout'
import { PriorityBadge } from '../../components/StatusBadge'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

export default function RejectedRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getRejected()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Employee</p>
          <h1 className="page-title">Rejected Requests</h1>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : requests.length === 0 ? (
          <EmptyState message="No rejected requests." />
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.pr_id} className="card border-red-900/30 hover:border-red-800/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">#{r.pr_id}</span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {r.department} · {r.quantity} units · ₹{parseFloat(r.total_amount).toLocaleString()}
                    </p>
                    {r.manager_comment && (
                      <div className="mt-2 px-3 py-2 bg-red-950/20 border border-red-900/40 text-xs text-red-400 font-mono">
                        Reason: {r.manager_comment}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-mono text-[10px] text-red-400 uppercase tracking-widest bg-red-950/30 border border-red-900/40 px-2 py-0.5">Rejected</span>
                    <button
                      onClick={() => navigate('/employee/new')}
                      className="text-xs text-amber-500 hover:text-amber-400 font-mono transition-colors">
                      Re-submit →
                    </button>
                    <button
                      onClick={() => navigate(`/employee/requests/${r.pr_id}/exception`)}
                      className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors">
                      Raise exception
                    </button>
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
