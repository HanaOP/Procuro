import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'
import { getCompletedAuditTrails } from '../../api/managerApi'

const STATUS_BADGE = {
  Requested: 'bg-blue-900/40 text-blue-300 border-blue-800/40',
  Invoiced: 'bg-indigo-900/40 text-indigo-300 border-indigo-800/40',
  Approved: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
  Rejected: 'bg-red-900/40 text-red-300 border-red-800/40',
  'Payment Initiated': 'bg-amber-900/40 text-amber-300 border-amber-800/40',
  Paid: 'bg-green-900/40 text-green-300 border-green-800/40',
  Completed: 'bg-teal-900/40 text-teal-300 border-teal-800/40',
  Failed: 'bg-rose-900/40 text-rose-300 border-rose-800/40',
  Flagged: 'bg-orange-900/40 text-orange-300 border-orange-800/40',
}

export default function AuditTrail() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trails, setTrails] = useState([])

  const loadTrails = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getCompletedAuditTrails()
      setTrails(data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load completed audit trails')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrails()
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-title mb-1">Manager</p>
            <h1 className="page-title">Audit Trail</h1>
            <p className="text-xs text-slate-500 mt-1">
              Completed procurement workflows with full chronological transaction logs.
            </p>
          </div>
          <button
            onClick={loadTrails}
            className="text-xs text-amber-500 hover:underline"
          >
            Refresh
          </button>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? (
          <LoadingSpinner />
        ) : trails.length === 0 ? (
          <EmptyState message="No completed procurement audit trails found." />
        ) : (
          <div className="space-y-4">
            {trails.map((trail) => (
              <div key={trail.requestId} className="card bg-slate-800/20 border-slate-800">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Procurement Workflow</p>
                    <h3 className="text-slate-100 font-medium mt-1">
                      PO #{trail.requestId}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Invoice: {trail.latestInvoice?.invoice_number || '-'}
                      {' · '}
                      Payment: {trail.paymentId || '-'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Completed At</p>
                    <p className="text-xs text-slate-200">
                      {trail.completedAt ? new Date(trail.completedAt).toLocaleString() : '-'}
                    </p>
                    <p className="text-sm font-mono text-amber-400 mt-1">
                      Rs. {trail.amount ? Number(trail.amount).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {trail.logs.map((log) => (
                    <div key={log.transactionId} className="pl-3 border-l border-slate-700/80">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_BADGE[log.status] || 'bg-slate-800 text-slate-200 border-slate-700'}`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 mt-1">{(log.action || '').replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-slate-400">By: {log.performedBy || 'System'}</p>
                      {log.remarks && <p className="text-[10px] text-slate-500 italic">{log.remarks}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
