import { useEffect, useState, useRef } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'
import api from '../../api/axiosInstance'

export default function SupplierApprovals() {
  const [approvals, setApprovals]     = useState([])
  const [allApprovals, setAllApprovals] = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [objection, setObjection]     = useState('')
  const [reason, setReason]           = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [message, setMessage]         = useState(null)
  const [activeTab, setActiveTab]     = useState('pending')
  const [timers, setTimers]           = useState({})
  const intervalRef = useRef(null)

  const fetchPending = () =>
    api.get('/procurement/supplier-approvals/pending')
      .then(({ data }) => setApprovals(data))
      .catch(console.error)
      .finally(() => setLoading(false))

  const fetchAll = () =>
    api.get('/procurement/supplier-approvals/all')
      .then(({ data }) => setAllApprovals(data))
      .catch(console.error)

  useEffect(() => {
    fetchPending(); fetchAll()
  }, [])

  // Live countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = new Date()
      const updated = {}
      approvals.forEach(a => {
        if (a.status === 'PENDING_MANAGER_REVIEW') {
          const diff = new Date(a.review_deadline) - now
          if (diff <= 0) {
            updated[a.approval_id] = '⚡ Auto-approving...'
          } else {
            const mins = Math.floor(diff / 60000)
            const secs = Math.floor((diff % 60000) / 1000)
            updated[a.approval_id] = `${mins}m ${secs}s`
          }
        }
      })
      setTimers(updated)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [approvals])

  // Auto-refresh every 30s to catch auto-approvals
  useEffect(() => {
    const refresh = setInterval(() => { fetchPending(); fetchAll() }, 30000)
    return () => clearInterval(refresh)
  }, [])

  const handleObjection = async (approval_id) => {
    if (!objection.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/procurement/supplier-approvals/${approval_id}/object`, { objection })
      setMessage({ type: 'success', text: '⚠️ Objection raised. Procurement officer will be notified to provide clarification.' })
      setObjection(''); setSelected(null)
      fetchPending(); fetchAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to raise objection' })
    } finally { setSubmitting(false) }
  }

  const handleApprove = async (approval_id) => {
    setSubmitting(true)
    try {
      await api.post(`/procurement/supplier-approvals/${approval_id}/approve`)
      setMessage({ type: 'success', text: '✅ Supplier approved. Purchase order created and supplier notified.' })
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
      setMessage({ type: 'success', text: '✗ Supplier rejected. Purchase request aborted.' })
      setReason(''); setSelected(null)
      fetchPending(); fetchAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to reject' })
    } finally { setSubmitting(false) }
  }

  const statusColor = (status) => ({
    PENDING_MANAGER_REVIEW: 'bg-amber-900/40 text-amber-400',
    MANAGER_OBJECTED:       'bg-red-900/40 text-red-400',
    CLARIFICATION_GIVEN:    'bg-blue-900/40 text-blue-400',
    APPROVED:               'bg-green-900/40 text-green-400',
    REJECTED:               'bg-red-900/40 text-red-500',
  }[status] || 'bg-slate-700 text-slate-300')

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <p className="section-title mb-1">Manager · Supplier Review</p>
          <h1 className="page-title">Supplier Selection Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review supplier selections by procurement. You have <strong className="text-amber-400">5 minutes</strong> to raise an objection before auto-approval.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`card ${message.type === 'success' ? 'border-green-800/50' : 'border-red-800/50'}`}>
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
            <button onClick={() => setMessage(null)} className="text-xs text-slate-500 mt-1 hover:text-slate-300">Dismiss</button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card">
            <p className="section-title mb-2">Pending Review</p>
            <p className="font-mono text-2xl font-medium text-amber-400">{approvals.length}</p>
          </div>
          <div className="card">
            <p className="section-title mb-2">Total Reviews</p>
            <p className="font-mono text-2xl font-medium text-slate-100">{allApprovals.length}</p>
          </div>
          <div className="card">
            <p className="section-title mb-2">Auto-Approved</p>
            <p className="font-mono text-2xl font-medium text-slate-100">
              {allApprovals.filter(a => a.auto_approved).length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800">
          {[
            { id: 'pending', label: `⏳ Pending Review (${approvals.length})` },
            { id: 'history', label: '📋 History' },
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
            <div className="card text-center py-8">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-slate-300 font-medium">No pending supplier selections</p>
              <p className="text-slate-500 text-sm mt-1">All supplier selections have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map(a => (
                <div key={a.approval_id} className={`card space-y-4 ${
                  a.status === 'CLARIFICATION_GIVEN' ? 'border-blue-800/50' : ''
                }`}>

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-slate-100 font-medium text-base">
                        🏭 {a.Supplier?.name}
                        <span className="text-slate-500 text-sm font-normal ml-2">selected for PR #{a.pr_id}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Item: <span className="text-slate-300">{a.PurchaseRequest?.item_name}</span>
                        · Dept: <span className="text-slate-300">{a.PurchaseRequest?.department}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Selected by: <span className="text-slate-300">{a.ProcurementUser?.name}</span>
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

                  {/* Quotation details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-800/50 rounded p-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Quote Price</p>
                      <p className="text-amber-400 font-mono font-medium">₹{parseFloat(a.Quotation?.price || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Delivery</p>
                      <p className="text-slate-300">{a.Quotation?.delivery_time || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Terms</p>
                      <p className="text-slate-300 text-xs">{a.Quotation?.terms || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Department</p>
                      <p className="text-slate-300">{a.PurchaseRequest?.department}</p>
                    </div>
                  </div>

                  {/* Procurement clarification */}
                  {a.procurement_clarification && (
                    <div className="bg-blue-900/20 border border-blue-800/40 rounded p-3">
                      <p className="text-xs text-blue-400 mb-1 font-medium">💬 Procurement Clarification:</p>
                      <p className="text-sm text-slate-300">{a.procurement_clarification}</p>
                    </div>
                  )}

                  {/* Manager's existing objection */}
                  {a.manager_objection && a.status === 'CLARIFICATION_GIVEN' && (
                    <div className="bg-red-900/20 border border-red-800/40 rounded p-3">
                      <p className="text-xs text-red-400 mb-1 font-medium">⚠️ Your Objection:</p>
                      <p className="text-sm text-slate-300">{a.manager_objection}</p>
                    </div>
                  )}

                  {/* Action area */}
                  {selected === a.approval_id ? (
                    <div className="space-y-3 border-t border-slate-800 pt-3">

                      {/* Raise objection — only for PENDING */}
                      {a.status === 'PENDING_MANAGER_REVIEW' && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400 font-medium">Raise Objection (optional):</p>
                          <textarea
                            value={objection}
                            onChange={e => setObjection(e.target.value)}
                            placeholder="Describe your concern — e.g. same supplier selected 3 times in a row, possible conflict of interest..."
                            className="input-field w-full h-20 text-sm resize-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleObjection(a.approval_id)}
                              disabled={submitting || !objection.trim()}
                              className="px-4 py-2 text-sm bg-red-900/40 text-red-400 border border-red-800/50 rounded hover:bg-red-900/60 transition-colors disabled:opacity-50"
                            >
                              ⚠️ Raise Objection
                            </button>
                            <button
                              onClick={() => handleApprove(a.approval_id)}
                              disabled={submitting}
                              className="btn-primary text-sm"
                            >
                              ✅ Approve Now
                            </button>
                            <button onClick={() => setSelected(null)} className="btn-secondary text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Final decision after clarification */}
                      {a.status === 'CLARIFICATION_GIVEN' && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400 font-medium">Final Decision:</p>
                          <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Rejection reason (required to reject and abort PR)..."
                            className="input-field w-full h-16 text-sm resize-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleApprove(a.approval_id)}
                              disabled={submitting}
                              className="btn-primary text-sm"
                            >
                              ✅ Satisfactory — Approve Supplier
                            </button>
                            <button
                              onClick={() => handleReject(a.approval_id)}
                              disabled={submitting || !reason.trim()}
                              className="px-4 py-2 text-sm bg-red-900/40 text-red-400 border border-red-800/50 rounded hover:bg-red-900/60 transition-colors disabled:opacity-50"
                            >
                              ✗ Not Satisfactory — Abort PR
                            </button>
                            <button onClick={() => setSelected(null)} className="btn-secondary text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelected(a.approval_id)}
                      className="btn-secondary text-sm w-full"
                    >
                      🔍 Review This Selection
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
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">No history yet</td></tr>
                ) : allApprovals.map(a => (
                  <tr key={a.approval_id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-slate-400">#{a.pr_id}</td>
                    <td className="p-3 text-slate-100">{a.PurchaseRequest?.item_name}</td>
                    <td className="p-3 text-amber-400">{a.Supplier?.name}</td>
                    <td className="p-3 text-right font-mono text-slate-300">₹{parseFloat(a.Quotation?.price || 0).toLocaleString()}</td>
                    <td className="p-3 text-slate-400">{a.ProcurementUser?.name}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${statusColor(a.status)}`}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs">
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