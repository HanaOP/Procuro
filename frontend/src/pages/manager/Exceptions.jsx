import { useEffect, useState } from 'react'
import { getExceptions } from '../../api/managerApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'

const URGENCY_COLOR = {
  HIGH:   'text-red-400 border-red-800/60 bg-red-950/20',
  MEDIUM: 'text-amber-400 border-amber-800/60 bg-amber-950/20',
  LOW:    'text-slate-400 border-slate-700 bg-surface-800',
}

export default function ManagerExceptions() {
  const [exceptions, setExceptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getExceptions()
      .then(({ data }) => setExceptions(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Manager</p>
          <h1 className="page-title">Exceptions</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">Employee-raised exceptions requiring review</p>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : exceptions.length === 0 ? (
          <EmptyState message="No exceptions raised." />
        ) : (
          <div className="space-y-3">
            {exceptions.map(ex => (
              <div key={ex.exception_id} className="card space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">EX#{ex.exception_id}</span>
                      <span className="font-mono text-xs text-slate-600">→ PR#{ex.pr_id}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200">{ex.exception_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${URGENCY_COLOR[ex.urgency_level] || URGENCY_COLOR.LOW}`}>
                    {ex.urgency_level}
                  </span>
                </div>

                <div className="bg-surface-800 border border-surface-700 px-4 py-3">
                  <p className="section-title mb-1">Reason</p>
                  <p className="text-sm text-slate-300">{ex.reason}</p>
                </div>

                {ex.PurchaseRequest && (
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-surface-800 px-3 py-2">
                      <p className="text-slate-600 mb-0.5">Item</p>
                      <p className="text-slate-300 truncate">{ex.PurchaseRequest.item_name}</p>
                    </div>
                    <div className="bg-surface-800 px-3 py-2">
                      <p className="text-slate-600 mb-0.5">Department</p>
                      <p className="text-slate-300">{ex.PurchaseRequest.department}</p>
                    </div>
                    <div className="bg-surface-800 px-3 py-2">
                      <p className="text-slate-600 mb-0.5">Total</p>
                      <p className="text-slate-300">₹{parseFloat(ex.PurchaseRequest.total_amount).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-600 font-mono">Raised {new Date(ex.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
