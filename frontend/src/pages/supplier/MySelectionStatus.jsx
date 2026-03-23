/**
 * MySelectionStatus.jsx
 * Supplier page — shows whether they were selected as the supplier
 * for any purchase request, and the current approval status.
 * Route: /supplier/selection-status
 */

import { useEffect, useState, useRef } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState } from '../../components/Feedback'
import api from '../../api/axiosInstance'

const STATUS_META = {
  PENDING_MANAGER_REVIEW: {
    label: '⏳ Pending Manager Review',
    color: 'bg-amber-900/40 text-amber-400 border-amber-800/40',
    card:  'border-amber-800/30',
    desc:  'The procurement officer has selected you. The manager is reviewing this selection.',
  },
  MANAGER_OBJECTED: {
    label: '⚠️ Manager Raised Objection',
    color: 'bg-red-900/40 text-red-400 border-red-800/40',
    card:  'border-red-800/30',
    desc:  'The manager has raised a concern about your selection. The procurement officer is providing clarification.',
  },
  CLARIFICATION_GIVEN: {
    label: '💬 Clarification Given',
    color: 'bg-blue-900/40 text-blue-400 border-blue-800/40',
    card:  'border-blue-800/30',
    desc:  'The procurement officer has responded to the objection. Awaiting manager\'s final decision.',
  },
  APPROVED: {
    label: '✅ You Are the Selected Supplier!',
    color: 'bg-green-900/40 text-green-400 border-green-800/40',
    card:  'border-green-800/40',
    desc:  'Congratulations! You have been officially selected as the supplier. A purchase order has been created.',
  },
  REJECTED: {
    label: '✗ Not Selected',
    color: 'bg-slate-700 text-slate-400 border-slate-600',
    card:  'border-slate-700',
    desc:  'Your quotation was not accepted for this purchase request.',
  },
}

export default function MySelectionStatus() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [timers, setTimers]       = useState({})
  const intervalRef = useRef(null)

  useEffect(() => {
    api.get('/supplier/selection-status')
      .then(({ data }) => setApprovals(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load selection status'))
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const r = setInterval(() => {
      api.get('/supplier/selection-status')
        .then(({ data }) => setApprovals(data))
        .catch(console.error)
    }, 30000)
    return () => clearInterval(r)
  }, [])

  // Live countdown for PENDING_MANAGER_REVIEW
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now     = new Date()
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

  const approved  = approvals.filter(a => a.status === 'APPROVED')
  const pending   = approvals.filter(a => ['PENDING_MANAGER_REVIEW', 'CLARIFICATION_GIVEN', 'MANAGER_OBJECTED'].includes(a.status))
  const rejected  = approvals.filter(a => a.status === 'REJECTED')

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <p className="section-title mb-1">Supplier · Selection Status</p>
          <h1 className="page-title">My Selection Status</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track whether you have been chosen as the supplier for purchase requests.
          </p>
        </div>

        {error && (
          <div className="card border-red-800/50">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Summary stat cards */}
        {!loading && approvals.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card border-green-800/30">
              <p className="section-title mb-2">Approved</p>
              <p className="font-mono text-2xl font-medium text-green-400">{approved.length}</p>
            </div>
            <div className="card border-amber-800/30">
              <p className="section-title mb-2">In Review</p>
              <p className="font-mono text-2xl font-medium text-amber-400">{pending.length}</p>
            </div>
            <div className="card">
              <p className="section-title mb-2">Not Selected</p>
              <p className="font-mono text-2xl font-medium text-slate-400">{rejected.length}</p>
            </div>
          </div>
        )}

        {/* How it works info card */}
        <div className="card border-amber-800/30 bg-amber-900/5">
          <p className="text-amber-400 text-sm font-medium mb-2">📋 How the selection process works</p>
          <div className="space-y-1 text-xs text-slate-400">
            <p>1. You submit a quotation for an open RFQ</p>
            <p>2. The procurement officer reviews quotations and selects a supplier</p>
            <p>3. The manager has <strong className="text-amber-400">5 minutes</strong> to raise an objection</p>
            <p>4. If no objection → you are <strong className="text-green-400">automatically confirmed</strong> ⚡</p>
            <p>5. If objected → procurement clarifies → manager gives final decision</p>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : approvals.length === 0 ? (
          <EmptyState message="No selection decisions yet. Submit quotations to open RFQs to get started." />
        ) : (
          <div className="space-y-4">
            {approvals.map(a => {
              const meta = STATUS_META[a.status] || {
                label: a.status.replace(/_/g, ' '),
                color: 'bg-slate-700 text-slate-300 border-slate-600',
                card:  '',
                desc:  '',
              }

              return (
                <div key={a.approval_id} className={`card space-y-4 ${meta.card}`}>

                  {/* Approved banner */}
                  {a.status === 'APPROVED' && (
                    <div className="bg-green-900/20 border border-green-800/40 rounded p-3 text-center">
                      <p className="text-green-400 font-semibold text-base">
                        🎉 You have been selected as the supplier!
                      </p>
                      {a.auto_approved && (
                        <p className="text-xs text-green-500 mt-1">⚡ Auto-approved — manager did not raise an objection</p>
                      )}
                    </div>
                  )}

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-600">PR #{a.pr_id}</span>
                        {a.Quotation && (
                          <span className="font-mono text-xs text-slate-600">· Q#{a.Quotation.quotation_id}</span>
                        )}
                      </div>
                      <p className="text-slate-100 font-medium">
                        {a.PurchaseRequest?.item_name || 'Purchase Request'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {a.PurchaseRequest?.department} · Qty: {a.PurchaseRequest?.quantity}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-1 rounded font-mono border ${meta.color}`}>
                        {meta.label}
                      </span>
                      {a.status === 'PENDING_MANAGER_REVIEW' && timers[a.approval_id] && (
                        <p className="text-xs text-amber-400 mt-1 font-mono">
                          ⏱ {timers[a.approval_id]} remaining
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quotation details */}
                  {a.Quotation && (
                    <div className="grid grid-cols-3 gap-3 bg-slate-800/50 rounded p-3 text-xs">
                      <div>
                        <p className="text-slate-500 mb-0.5">Your Quote</p>
                        <p className="font-mono text-amber-400 font-medium">
                          ₹{parseFloat(a.Quotation.price).toLocaleString()}
                        </p>
                      </div>
                      {a.Quotation.delivery_time && (
                        <div>
                          <p className="text-slate-500 mb-0.5">Delivery</p>
                          <p className="text-slate-300">{a.Quotation.delivery_time}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-500 mb-0.5">Selected On</p>
                        <p className="text-slate-300 font-mono">
                          {new Date(a.selected_at || a.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status description */}
                  <p className="text-xs text-slate-400">{meta.desc}</p>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
