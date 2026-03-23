/**
 * ViewQuotationsList.jsx
 * Procurement sidebar: "View Quotations"
 * Shows all RFQs that have been sent, and their submitted quotations.
 * Route: /procurement/view-quotations
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert, SuccessAlert } from '../../components/Feedback'
import { selectSupplier, viewQuotations } from '../../api/procurementApi'
import api from '../../api/axiosInstance'

export default function ViewQuotationsList() {
  const [rfqs, setRfqs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [expanded, setExpanded] = useState(null)
  const [quotations, setQuotations] = useState({}) // rfq_id → quotes[]
  const [loadingQ, setLoadingQ] = useState({})
  const [selecting, setSelecting] = useState(null)
  const navigate = useNavigate()

  // Load all RFQs that have been sent
  useEffect(() => {
    api.get('/procurement/requests')
      .then(({ data }) => {
        // Show only RFQ_SENT and SUPPLIER_SELECTED status
        const rfqPRs = data.filter(r =>
          ['RFQ_SENT', 'SUPPLIER_SELECTED', 'ORDER_PLACED'].includes(r.status)
        )
        setRfqs(rfqPRs)
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  // Load quotations for a specific PR's RFQ
  const loadQuotations = async (pr_id, rfq_id) => {
    if (quotations[rfq_id]) return // already loaded
    setLoadingQ(prev => ({ ...prev, [rfq_id]: true }))
    try {
      const { data } = await viewQuotations(rfq_id)
      setQuotations(prev => ({ ...prev, [rfq_id]: data }))
    } catch (err) {
      setError('Failed to load quotations for RFQ #' + rfq_id)
    } finally {
      setLoadingQ(prev => ({ ...prev, [rfq_id]: false }))
    }
  }

  const handleExpand = (r) => {
    if (expanded === r.pr_id) {
      setExpanded(null)
    } else {
      setExpanded(r.pr_id)
      if (r.rfq_id) loadQuotations(r.pr_id, r.rfq_id)
    }
  }

  const handleSelect = async (quotation_id) => {
    setSelecting(quotation_id); setError(''); setSuccess('')
    try {
      await selectSupplier(quotation_id)
      setSuccess('✅ Supplier selection sent to manager for review. Manager has 5 minutes to raise an objection.')
      setTimeout(() => navigate('/procurement/supplier-approvals'), 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to select supplier')
    } finally { setSelecting(null) }
  }

  const statusColor = (status) => {
    const map = {
      RFQ_SENT:          'text-cyan-400',
      SUPPLIER_SELECTED: 'text-amber-400',
      ORDER_PLACED:      'text-green-400',
    }
    return map[status] || 'text-slate-400'
  }

  const statusLabel = (status) => {
    const map = {
      RFQ_SENT:          '📤 RFQ Sent — Awaiting Quotations',
      SUPPLIER_SELECTED: '⏳ Supplier Selected — Pending Manager Review',
      ORDER_PLACED:      '✅ Order Placed',
    }
    return map[status] || status
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Procurement</p>
          <h1 className="page-title">View Quotations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review supplier quotations and select a supplier to send for manager approval.
          </p>
        </div>

        {error   && <div className="card border-red-800/50"><p className="text-red-400 text-sm">{error}</p></div>}
        {success && <div className="card border-green-800/50"><p className="text-green-400 text-sm">{success}</p></div>}

        {loading ? <LoadingSpinner /> : rfqs.length === 0 ? (
          <EmptyState message="No RFQs sent yet. Send an RFQ from Approved PRs first." />
        ) : (
          <div className="space-y-3">
            {rfqs.map(r => {
              const isExpanded = expanded === r.pr_id
              const quotes     = quotations[r.rfq_id] || []
              const isLoading  = loadingQ[r.rfq_id]
              const minPrice   = quotes.length > 0
                ? Math.min(...quotes.map(q => parseFloat(q.price)))
                : null

              return (
                <div key={r.pr_id} className="card space-y-3">
                  {/* Header */}
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => handleExpand(r)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-600">PR #{r.pr_id}</span>
                        {r.rfq_id && (
                          <span className="font-mono text-xs text-slate-600">· RFQ #{r.rfq_id}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-200">{r.item_name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {r.department} · {r.quantity} units · ₹{parseFloat(r.total_amount || 0).toLocaleString()}
                      </p>
                      <p className={`text-xs font-mono mt-1 ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'RFQ_SENT' && (
                        <span className="text-xs bg-cyan-900/30 text-cyan-400 border border-cyan-800/40 px-2 py-0.5 rounded font-mono">
                          {quotes.length > 0 ? `${quotes.length} quote${quotes.length > 1 ? 's' : ''}` : 'No quotes yet'}
                        </span>
                      )}
                      <span className="text-slate-600 text-sm">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded quotations */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 pt-3 space-y-3">
                      {isLoading ? (
                        <LoadingSpinner />
                      ) : quotes.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-slate-500 text-sm">📭 No quotations submitted yet</p>
                          <p className="text-xs text-slate-600 mt-1">Suppliers haven't responded to this RFQ</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                            {quotes.length} Quotation{quotes.length > 1 ? 's' : ''} Received
                          </p>
                          {quotes
                            .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
                            .map(q => {
                              const isCheapest = parseFloat(q.price) === minPrice
                              return (
                                <div
                                  key={q.quotation_id}
                                  className={`bg-slate-800/50 border rounded p-4 space-y-3 ${
                                    isCheapest ? 'border-green-800/50' : 'border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs text-slate-600">Q#{q.quotation_id}</span>
                                        {isCheapest && (
                                          <span className="text-[10px] font-mono text-green-400 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 uppercase tracking-widest">
                                            ★ Lowest Price
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-400">
                                        Supplier: <span className="text-amber-400">{q.User?.name || `ID ${q.supplier_id}`}</span>
                                      </p>
                                      {q.delivery_time && (
                                        <p className="text-xs text-slate-500 mt-0.5">🚚 {q.delivery_time}</p>
                                      )}
                                      {q.terms && (
                                        <p className="text-xs text-slate-500 mt-0.5">📋 {q.terms}</p>
                                      )}
                                      {q.submitted_at && (
                                        <p className="text-xs text-slate-600 mt-0.5 font-mono">
                                          Submitted: {new Date(q.submitted_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-mono text-xl font-medium text-amber-400">
                                        ₹{parseFloat(q.price).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Contract document */}
                                  {q.contract_document && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-xs">
                                      <span>📄</span>
                                      <a
                                        href={`/uploads/${q.contract_document}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-400 hover:text-amber-300 underline"
                                      >
                                        View Contract Document
                                      </a>
                                    </div>
                                  )}

                                  {/* Select button — only show if PR is still RFQ_SENT */}
                                  {r.status === 'RFQ_SENT' && (
                                    <button
                                      onClick={() => handleSelect(q.quotation_id)}
                                      disabled={!!selecting}
                                      className={`w-full py-2 px-4 text-xs font-medium rounded transition-colors ${
                                        isCheapest
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
                                          : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                                      }`}
                                    >
                                      {selecting === q.quotation_id
                                        ? '⏳ Sending to manager...'
                                        : '🏭 Select This Supplier → Send to Manager'}
                                    </button>
                                  )}

                                  {r.status === 'SUPPLIER_SELECTED' && (
                                    <p className="text-xs text-amber-400 text-center">
                                      ⏳ Awaiting manager review
                                    </p>
                                  )}

                                  {r.status === 'ORDER_PLACED' && (
                                    <p className="text-xs text-green-400 text-center">
                                      ✅ Order placed
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}
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
