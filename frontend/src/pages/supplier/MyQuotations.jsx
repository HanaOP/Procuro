/**
 * MyQuotations.jsx
 * Supplier page — shows submitted quotations with selection status badge
 * Route: /supplier/quotations
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { myQuotations } from '../../api/supplierApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'
import api from '../../api/axiosInstance'

const SELECTION_STATUS = {
  PENDING_MANAGER_REVIEW: { label: '⏳ Pending Manager Review', cls: 'bg-amber-900/40 text-amber-400' },
  MANAGER_OBJECTED:       { label: '⚠️ Manager Objected',       cls: 'bg-red-900/40 text-red-400'    },
  CLARIFICATION_GIVEN:    { label: '💬 Clarification In Review', cls: 'bg-blue-900/40 text-blue-400'  },
  APPROVED:               { label: '✅ Selected — Approved!',    cls: 'bg-green-900/40 text-green-400' },
  REJECTED:               { label: '✗ Not Selected',             cls: 'bg-slate-700 text-slate-400'   },
}

export default function MyQuotations() {
  const [quotations, setQuotations] = useState([])
  const [selectionMap, setSelectionMap] = useState({}) // quotation_id → approval
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    Promise.allSettled([
      myQuotations(),
      api.get('/supplier/selection-status'),
    ]).then(([qs, sel]) => {
      if (qs.status === 'fulfilled') setQuotations(qs.value.data)
      else setError(qs.reason?.response?.data?.error || 'Failed to load quotations')

      if (sel.status === 'fulfilled') {
        const map = {}
        sel.value.data.forEach(a => {
          if (a.quotation_id) map[a.quotation_id] = a
        })
        setSelectionMap(map)
      }
    }).finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Supplier</p>
          <h1 className="page-title">My Quotations</h1>
          <p className="text-xs text-slate-500 mt-1">
            View your submitted quotations and see if you've been selected.{' '}
            <Link to="/supplier/selection-status" className="text-amber-400 hover:underline">
              View full selection status →
            </Link>
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : quotations.length === 0 ? (
          <EmptyState message="No quotations submitted yet." />
        ) : (
          <div className="space-y-2">
            {quotations.map(q => {
              const approval = selectionMap[q.quotation_id]
              const statusMeta = approval ? SELECTION_STATUS[approval.status] : null

              return (
                <div key={q.quotation_id} className={`card hover:border-slate-600 transition-colors ${
                  approval?.status === 'APPROVED' ? 'border-green-800/40' :
                  approval?.status === 'MANAGER_OBJECTED' ? 'border-red-800/30' : ''
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs text-slate-600">Q#{q.quotation_id}</span>
                        <span className="font-mono text-xs text-slate-600">· RFQ #{q.rfq_id}</span>
                        {q.RFQ?.PurchaseRequest && (
                          <span className="text-xs text-slate-400">
                            — {q.RFQ.PurchaseRequest.item_name}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-2 text-xs font-mono">
                        <div>
                          <p className="text-slate-600 mb-0.5">Price</p>
                          <p className="text-amber-400 font-medium">
                            ₹{parseFloat(q.price).toLocaleString()}
                          </p>
                        </div>

                        {q.delivery_time && (
                          <div>
                            <p className="text-slate-600 mb-0.5">Delivery</p>
                            <p className="text-slate-300">{q.delivery_time}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-slate-600 mb-0.5">Submitted</p>
                          <p className="text-slate-300">
                            {q.submitted_at
                              ? new Date(q.submitted_at).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {q.terms && (
                        <p className="text-xs text-slate-500 mt-2">Terms: {q.terms}</p>
                      )}

                      {q.contract_document && (
                        <div className="mt-2">
                          <a
                            href={`/uploads/${q.contract_document}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-amber-400 hover:text-amber-300 underline font-mono"
                          >
                            📄 View Contract Document
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs px-2 py-1 rounded font-mono bg-green-900/40 text-green-400">
                        Submitted
                      </span>
                      {statusMeta && (
                        <span className={`text-xs px-2 py-1 rounded font-mono ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Approved celebration banner */}
                  {approval?.status === 'APPROVED' && (
                    <div className="mt-3 bg-green-900/20 border border-green-800/40 rounded p-2 text-center">
                      <p className="text-green-400 text-xs font-medium">
                        🎉 You are the selected supplier for this purchase request!
                        {approval.auto_approved && ' (Auto-approved ⚡)'}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
