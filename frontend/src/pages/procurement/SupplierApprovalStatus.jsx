import { useEffect, useState, useRef } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'
import { giveClarification, getMySupplierApprovals } from '../../api/procurementApi'

export default function SupplierApprovalStatus() {
  const [approvals, setApprovals]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [clarification, setClarification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage]       = useState(null)
  const [timers, setTimers]         = useState({})
  const intervalRef = useRef(null)

  const fetchApprovals = () =>
    getMySupplierApprovals()
      .then(({ data }) => setApprovals(data))
      .catch(console.error)
      .finally(() => setLoading(false))

  useEffect(() => { fetchApprovals() }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const r = setInterval(fetchApprovals, 30000)
    return () => clearInterval(r)
  }, [])

  // Live countdown
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = new Date()
      const updated = {}
      approvals.forEach(a => {
        if (a.status === 'PENDING_MANAGER_REVIEW') {
          const diff = new Date(a.review_deadline) - now
          updated[a.approval_id] = diff <= 0
            ? '⚡ Auto-approving...'
            : `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`
        }
      })
      setTimers(updated)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [approvals])

  const handleClarification = async (approval_id) => {
    if (!clarification.trim()) return
    setSubmitting(true)
    try {
      await giveClarification(approval_id, { clarification })
      setMessage({ type: 'success', text: '💬 Clarification submitted to manager.' })
      setClarification(''); setSelected(null)
      fetchApprovals()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit' })
    } finally { setSubmitting(false) }
  }

  const statusColor = (status) => ({
    PENDING_MANAGER_REVIEW: 'bg-amber-900/40 text-amber-400',
    MANAGER_OBJECTED:       'bg-red-900/40 text-red-400',
    CLARIFICATION_GIVEN:    'bg-blue-900/40 text-blue-400',
    APPROVED:               'bg-green-900/40 text-green-400',
    REJECTED:               'bg-red-900/40 text-red-500',
  }[status] || 'bg-slate-700 text-slate-300')

  const statusDesc = (status, auto) => ({
    PENDING_MANAGER_REVIEW: '⏳ Waiting for manager review',
    MANAGER_OBJECTED:       '⚠️ Manager raised an objection — respond below',
    CLARIFICATION_GIVEN:    '💬 Clarification sent — awaiting manager decision',
    APPROVED:               auto ? '⚡ Auto-approved — supplier notified' : '✅ Approved by manager — supplier notified',
    REJECTED:               '✗ Rejected — purchase request aborted',
  }[status] || status)

  const pending   = approvals.filter(a => a.status === 'PENDING_MANAGER_REVIEW')
  const objected  = approvals.filter(a => a.status === 'MANAGER_OBJECTED')
  const resolved  = approvals.filter(a => ['APPROVED', 'REJECTED', 'CLARIFICATION_GIVEN'].includes(a.status))

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <p className="section-title mb-1">Procurement · Supplier Review</p>
          <h1 className="page-title">Supplier Approval Status</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your supplier selections. Manager has <strong className="text-amber-400">5 minutes</strong> to raise an objection before auto-approval.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`card ${message.type === 'success' ? 'border-green-800/50' : 'border-red-800/50'}`}>
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
            <button onClick={() => setMessage(null)} className="text-xs text-slate-500 mt-1 hover:text-slate-300">Dismiss</button>
          </div>
        )}

        {/* Info card */}
        <div className="card border-amber-800/30 bg-amber-900/5">
          <p className="text-amber-400 text-sm font-medium mb-2">📋 How the flow works</p>
          <div className="space-y-1 text-xs text-slate-400">
            <p>1. You select a supplier → sent to manager for review</p>
            <p>2. Manager has 5 minutes to raise an objection</p>
            <p>3. If no objection → supplier automatically notified ⚡</p>
            <p>4. If objected → you provide clarification here</p>
            <p>5. Manager reviews clarification → approves or aborts PR</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card">
            <p className="section-title mb-2">Pending Review</p>
            <p className="font-mono text-2xl font-medium text-amber-400">{pending.length}</p>
          </div>
          <div className={`card ${objected.length > 0 ? 'border-red-800/50' : ''}`}>
            <p className="section-title mb-2">Objections</p>
            <p className={`font-mono text-2xl font-medium ${objected.length > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {objected.length}
            </p>
          </div>
          <div className="card">
            <p className="section-title mb-2">Total Submitted</p>
            <p className="font-mono text-2xl font-medium text-slate-100">{approvals.length}</p>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : approvals.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-slate-400">No supplier selections yet</p>
            <p className="text-xs text-slate-500 mt-1">Select a supplier from View Quotations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map(a => (
              <div key={a.approval_id} className={`card space-y-3 ${
                a.status === 'MANAGER_OBJECTED'    ? 'border-red-800/50' :
                a.status === 'APPROVED'            ? 'border-green-800/30' :
                a.status === 'REJECTED'            ? 'border-red-800/50' :
                a.status === 'CLARIFICATION_GIVEN' ? 'border-blue-800/30' : ''
              }`}>

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-slate-100 font-medium">
                      🏭 {a.Supplier?.name}
                      <span className="text-slate-500 text-sm font-normal ml-2">— PR #{a.pr_id}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.PurchaseRequest?.item_name} · ₹{parseFloat(a.Quotation?.price || 0).toLocaleString()}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${
                      a.status === 'MANAGER_OBJECTED' ? 'text-red-400' :
                      a.status === 'APPROVED'         ? 'text-green-400' :
                      a.status === 'REJECTED'         ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {statusDesc(a.status, a.auto_approved)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-1 rounded font-mono ${statusColor(a.status)}`}>
                      {a.status.replace(/_/g, ' ')}
                    </span>
                    {a.status === 'PENDING_MANAGER_REVIEW' && timers[a.approval_id] && (
                      <p className="text-xs text-amber-400 mt-1 font-mono">
                        ⏱ {timers[a.approval_id]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Manager objection */}
                {a.manager_objection && (
                  <div className="bg-red-900/20 border border-red-800/40 rounded p-3">
                    <p className="text-xs text-red-400 mb-1 font-medium">⚠️ Manager Objection:</p>
                    <p className="text-sm text-slate-300">{a.manager_objection}</p>
                  </div>
                )}

                {/* Your clarification */}
                {a.procurement_clarification && (
                  <div className="bg-blue-900/20 border border-blue-800/40 rounded p-3">
                    <p className="text-xs text-blue-400 mb-1 font-medium">💬 Your Clarification:</p>
                    <p className="text-sm text-slate-300">{a.procurement_clarification}</p>
                  </div>
                )}

                {/* Respond to objection */}
                {a.status === 'MANAGER_OBJECTED' && (
                  selected === a.approval_id ? (
                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      <p className="text-xs text-slate-400 font-medium">Your response to manager:</p>
                      <textarea
                        value={clarification}
                        onChange={e => setClarification(e.target.value)}
                        placeholder="Explain why this supplier was selected — e.g. best price, previous good performance, only available supplier..."
                        className="input-field w-full h-20 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleClarification(a.approval_id)}
                          disabled={submitting || !clarification.trim()}
                          className="btn-primary text-sm"
                        >
                          {submitting ? '⏳ Submitting...' : '💬 Submit Clarification'}
                        </button>
                        <button onClick={() => setSelected(null)} className="btn-secondary text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelected(a.approval_id)}
                      className="btn-primary text-sm w-full"
                    >
                      💬 Respond to Objection
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}