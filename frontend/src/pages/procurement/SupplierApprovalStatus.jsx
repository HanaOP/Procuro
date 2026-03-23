import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'
import api from '../../api/axiosInstance'

export default function SupplierApprovalStatus() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [clarification, setClarification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage]     = useState(null)

  const fetchApprovals = () => {
    api.get('/procurement/supplier-approvals')
      .then(({ data }) => setApprovals(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchApprovals() }, [])

  // Auto-refresh every 30 seconds to catch auto-approvals
  useEffect(() => {
    const interval = setInterval(fetchApprovals, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleClarification = async (approval_id) => {
    if (!clarification.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/procurement/supplier-approvals/${approval_id}/clarify`, { clarification })
      setMessage({ type: 'success', text: 'Clarification submitted to manager.' })
      setClarification('')
      setSelected(null)
      fetchApprovals()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit' })
    } finally { setSubmitting(false) }
  }

  const statusColor = (status) => {
    const map = {
      PENDING_MANAGER_REVIEW: 'bg-amber-900/40 text-amber-400',
      MANAGER_OBJECTED:       'bg-red-900/40 text-red-400',
      CLARIFICATION_GIVEN:    'bg-blue-900/40 text-blue-400',
      APPROVED:               'bg-green-900/40 text-green-400',
      REJECTED:               'bg-red-900/40 text-red-500',
    }
    return map[status] || 'bg-slate-700 text-slate-300'
  }

  const statusLabel = (status, auto_approved) => {
    if (status === 'APPROVED' && auto_approved) return '⚡ Auto-Approved'
    if (status === 'APPROVED') return '✓ Approved by Manager'
    if (status === 'REJECTED') return '✗ Rejected — PR Aborted'
    return status.replace(/_/g, ' ')
  }

  const timeLeft = (deadline) => {
    const diff = new Date(deadline) - new Date()
    if (diff <= 0) return 'Processing...'
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}m ${secs}s left`
  }

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <p className="section-title mb-1">Supplier Approvals</p>
          <h1 className="page-title">Supplier Selection Status</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your supplier selections sent to manager for review.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`card ${message.type === 'success' ? 'border-green-800/50' : 'border-red-800/50'}`}>
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
            <button onClick={() => setMessage(null)} className="text-xs text-slate-500 mt-1">Dismiss</button>
          </div>
        )}

        {/* Info card */}
        <div className="card border-amber-800/30 bg-amber-900/10">
          <p className="text-amber-400 text-sm font-medium mb-1">How it works</p>
          <p className="text-xs text-slate-400">
            When you select a supplier, the manager has <strong className="text-slate-300">2 minutes</strong> to raise an objection.
            If no objection is raised, the supplier is automatically notified. If the manager objects,
            you must provide clarification. The manager then makes a final decision.
          </p>
        </div>

        {loading ? <LoadingSpinner /> : approvals.length === 0 ? (
          <div className="card text-center">
            <p className="text-slate-400">No supplier selections yet</p>
            <p className="text-xs text-slate-500 mt-1">Select a supplier from View Quotations to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map(a => (
              <div key={a.approval_id} className={`card space-y-3 ${
                a.status === 'MANAGER_OBJECTED' ? 'border-red-800/50' :
                a.status === 'APPROVED'         ? 'border-green-800/30' :
                a.status === 'REJECTED'         ? 'border-red-800/50' : ''
              }`}>

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-100 font-medium">
                      PR #{a.pr_id} — {a.PurchaseRequest?.item_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supplier: <span className="text-amber-400">{a.Supplier?.name}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Price: <span className="font-mono text-slate-300">${a.Quotation?.price?.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded font-mono ${statusColor(a.status)}`}>
                      {statusLabel(a.status, a.auto_approved)}
                    </span>
                    {a.status === 'PENDING_MANAGER_REVIEW' && (
                      <p className="text-xs text-amber-400 mt-1 font-mono">
                        ⏱ {timeLeft(a.review_deadline)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Manager objection */}
                {a.manager_objection && (
                  <div className="bg-red-900/20 border border-red-800/40 rounded p-3">
                    <p className="text-xs text-red-400 mb-1">⚠️ Manager Objection:</p>
                    <p className="text-sm text-slate-300">{a.manager_objection}</p>
                  </div>
                )}

                {/* Your clarification */}
                {a.procurement_clarification && (
                  <div className="bg-blue-900/20 border border-blue-800/40 rounded p-3">
                    <p className="text-xs text-blue-400 mb-1">Your Clarification:</p>
                    <p className="text-sm text-slate-300">{a.procurement_clarification}</p>
                  </div>
                )}

                {/* Clarification form */}
                {a.status === 'MANAGER_OBJECTED' && (
                  selected === a.approval_id ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Provide clarification to manager:</p>
                      <textarea
                        value={clarification}
                        onChange={e => setClarification(e.target.value)}
                        placeholder="Explain why this supplier was selected despite the concern..."
                        className="input-field w-full h-20 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleClarification(a.approval_id)} disabled={submitting || !clarification.trim()} className="btn-primary text-sm">
                          {submitting ? 'Submitting...' : 'Submit Clarification'}
                        </button>
                        <button onClick={() => setSelected(null)} className="btn-secondary text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setSelected(a.approval_id)} className="btn-primary text-sm">
                      Respond to Objection
                    </button>
                  )
                )}

                {/* Final status messages */}
                {a.status === 'APPROVED' && (
                  <p className="text-xs text-green-400">
                    ✓ {a.auto_approved ? 'No objection raised — supplier automatically notified.' : 'Manager approved — supplier notified and PO created.'}
                  </p>
                )}
                {a.status === 'REJECTED' && (
                  <p className="text-xs text-red-400">
                    ✗ Purchase request has been aborted. Reason: {a.manager_objection}
                  </p>
                )}
                {a.status === 'CLARIFICATION_GIVEN' && (
                  <p className="text-xs text-blue-400">
                    ⏳ Clarification submitted. Waiting for manager's final decision.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
