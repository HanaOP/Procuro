import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'
import api from '../../api/axiosInstance'

export default function SupplierApprovals() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [objection, setObjection] = useState('')
  const [reason, setReason]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage]     = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [allApprovals, setAllApprovals] = useState([])

  const fetchPending = () => {
    api.get('/procurement/supplier-approvals/pending')
      .then(({ data }) => setApprovals(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const fetchAll = () => {
    api.get('/procurement/supplier-approvals/all')
      .then(({ data }) => setAllApprovals(data))
      .catch(console.error)
  }

  useEffect(() => { fetchPending(); fetchAll() }, [])

  const handleObjection = async (approval_id) => {
    if (!objection.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/procurement/supplier-approvals/${approval_id}/object`, { objection })
      setMessage({ type: 'success', text: 'Objection raised. Procurement will be notified.' })
      setObjection('')
      setSelected(null)
      fetchPending(); fetchAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to raise objection' })
    } finally { setSubmitting(false) }
  }

  const handleApprove = async (approval_id) => {
    setSubmitting(true)
    try {
      await api.post(`/procurement/supplier-approvals/${approval_id}/approve`)
      setMessage({ type: 'success', text: 'Supplier approved. PO created and supplier notified.' })
      setSelected(null)
      fetchPending(); fetchAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to approve' })
    } finally { setSubmitting(false) }
  }

  const handleReject = async (approval_id) => {
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/procurement/supplier-approvals/${approval_id}/reject`, { reason })
      setMessage({ type: 'success', text: 'Supplier rejected. Purchase request aborted.' })
      setReason('')
      setSelected(null)
      fetchPending(); fetchAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to reject' })
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

  const timeLeft = (deadline) => {
    const diff = new Date(deadline) - new Date()
    if (diff <= 0) return 'Expired'
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <p className="section-title mb-1">Supplier Review</p>
          <h1 className="page-title">Supplier Selection Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review supplier selections made by procurement. You have 2 minutes to raise an objection.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`card ${message.type === 'success' ? 'border-green-800/50' : 'border-red-800/50'}`}>
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
            <button onClick={() => setMessage(null)} className="text-xs text-slate-500 mt-1">Dismiss</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800">
          {[
            { id: 'pending', label: `Pending Review (${approvals.length})` },
            { id: 'history', label: 'History' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          loading ? <LoadingSpinner /> : approvals.length === 0 ? (
            <div className="card text-center">
              <p className="text-slate-400">No pending supplier selections to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map(a => (
                <div key={a.approval_id} className="card space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-100 font-medium">
                        PR #{a.pr_id} — {a.PurchaseRequest?.item_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Supplier: <span className="text-amber-400">{a.Supplier?.name}</span> ({a.Supplier?.email})
                      </p>
                      <p className="text-xs text-slate-500">
                        Selected by: {a.ProcurementUser?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded font-mono ${statusColor(a.status)}`}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                      {a.status === 'PENDING_MANAGER_REVIEW' && (
                        <p className="text-xs text-amber-400 mt-1 font-mono">
                          ⏱ {timeLeft(a.review_deadline)} remaining
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quotation Details */}
                  <div className="bg-slate-800/50 rounded p-3 text-sm grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-slate-500 text-xs">Quote Price</p>
                      <p className="text-slate-100 font-mono">${a.Quotation?.price?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Delivery Time</p>
                      <p className="text-slate-100">{a.Quotation?.delivery_time || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Terms</p>
                      <p className="text-slate-100 text-xs">{a.Quotation?.terms || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Department</p>
                      <p className="text-slate-100">{a.PurchaseRequest?.department}</p>
                    </div>
                  </div>

                  {/* Clarification given by procurement */}
                  {a.procurement_clarification && (
                    <div className="bg-blue-900/20 border border-blue-800/40 rounded p-3">
                      <p className="text-xs text-blue-400 mb-1">Procurement Clarification:</p>
                      <p className="text-sm text-slate-300">{a.procurement_clarification}</p>
                    </div>
                  )}

                  {/* Manager Objection shown */}
                  {a.manager_objection && (
                    <div className="bg-red-900/20 border border-red-800/40 rounded p-3">
                      <p className="text-xs text-red-400 mb-1">Your Objection:</p>
                      <p className="text-sm text-slate-300">{a.manager_objection}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {selected === a.approval_id ? (
                    <div className="space-y-3">
                      {/* Raise Objection Form */}
                      {a.status === 'PENDING_MANAGER_REVIEW' && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500">Raise Objection:</p>
                          <textarea
                            value={objection}
                            onChange={e => setObjection(e.target.value)}
                            placeholder="Describe your concern about this supplier selection..."
                            className="input-field w-full h-20 text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleObjection(a.approval_id)} disabled={submitting || !objection.trim()} className="btn-primary text-sm">
                              {submitting ? 'Raising...' : 'Raise Objection'}
                            </button>
                            <button onClick={() => handleApprove(a.approval_id)} disabled={submitting} className="btn-secondary text-sm">
                              {submitting ? '...' : 'Approve Now'}
                            </button>
                            <button onClick={() => setSelected(null)} className="btn-secondary text-sm">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* After clarification: approve or reject */}
                      {a.status === 'CLARIFICATION_GIVEN' && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500">Final Decision:</p>
                          <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Rejection reason (required to reject)..."
                            className="input-field w-full h-16 text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(a.approval_id)} disabled={submitting} className="btn-primary text-sm">
                              ✓ Approve — Proceed with Supplier
                            </button>
                            <button onClick={() => handleReject(a.approval_id)} disabled={submitting || !reason.trim()} className="bg-red-900/40 text-red-400 border border-red-800/50 px-4 py-2 rounded text-sm hover:bg-red-900/60 transition-colors">
                              ✗ Reject — Abort PR
                            </button>
                            <button onClick={() => setSelected(null)} className="btn-secondary text-sm">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => setSelected(a.approval_id)} className="btn-secondary text-sm">
                      Review This Selection
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                  <th className="text-left p-3">PR</th>
                  <th className="text-left p-3">Item</th>
                  <th className="text-left p-3">Supplier</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-left p-3">Selected By</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Auto</th>
                </tr>
              </thead>
              <tbody>
                {allApprovals.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center text-slate-500">No history yet</td></tr>
                ) : allApprovals.map(a => (
                  <tr key={a.approval_id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-slate-400">#{a.pr_id}</td>
                    <td className="p-3 text-slate-100">{a.PurchaseRequest?.item_name}</td>
                    <td className="p-3 text-amber-400">{a.Supplier?.name}</td>
                    <td className="p-3 text-right font-mono text-slate-300">${a.Quotation?.price?.toLocaleString()}</td>
                    <td className="p-3 text-slate-400">{a.ProcurementUser?.name}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${statusColor(a.status)}`}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs text-slate-500">
                      {a.auto_approved ? '⚡ Auto' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </AppLayout>
  )
}