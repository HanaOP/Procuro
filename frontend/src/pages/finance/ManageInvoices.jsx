/**
 * ManageInvoices.jsx
 * Finance page — view and process uploaded invoices
 * Route: /finance/invoices
 */

import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'
import api from '../../api/axiosInstance'

const STATUS_BADGE = {
  PENDING:  'bg-amber-900/40 text-amber-500 border-amber-800/40',
  PAID:     'bg-green-900/40 text-green-400 border-green-800/40',
  REJECTED: 'bg-red-900/40 text-red-400 border-red-800/40',
}

const TX_STATUS_BADGE = {
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

export default function ManageInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // invoice_id
  const [transactionLogs, setTransactionLogs] = useState({})
  const [timelineLoading, setTimelineLoading] = useState({})
  const [expandedTimeline, setExpandedTimeline] = useState({})

  useEffect(() => {
    loadInvoices()
  }, [])

  useEffect(() => {
    ensureRazorpayScript().catch(() => {
      setError('Unable to load Razorpay checkout script. Payments may not open.')
    })
  }, [])

  const ensureRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Razorpay SDK failed to load'))
    document.body.appendChild(script)
  })

  const loadInvoices = () => {
    setLoading(true)
    api.get('/finance/invoices')
      .then(({ data }) => setInvoices(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load invoices'))
      .finally(() => setLoading(false))
  }

  const updateStatus = async (id, status) => {
    setActionLoading(id)
    try {
      await api.post(`/finance/invoices/${id}/status`, { status })
      setInvoices(prev => prev.map(inv => inv.invoice_id === id ? { ...inv, status } : inv))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const loadTimeline = async (invoiceId) => {
    setTimelineLoading(prev => ({ ...prev, [invoiceId]: true }))
    try {
      const { data } = await api.get(`/finance/invoices/${invoiceId}/transactions`)
      const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      setTransactionLogs(prev => ({ ...prev, [invoiceId]: sorted }))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transaction timeline')
    } finally {
      setTimelineLoading(prev => ({ ...prev, [invoiceId]: false }))
    }
  }

  const toggleTimeline = async (invoiceId) => {
    const nextExpanded = !expandedTimeline[invoiceId]
    setExpandedTimeline(prev => ({ ...prev, [invoiceId]: nextExpanded }))

    if (nextExpanded && !transactionLogs[invoiceId]) {
      await loadTimeline(invoiceId)
    }
  }

  const openPaymentWindow = async (invoice) => {
    setActionLoading(invoice.invoice_id)
    setError('')
    try {
      await ensureRazorpayScript()

      const { data } = await api.post(`/finance/invoices/${invoice.invoice_id}/payment-order`)
      const { keyId, order, invoice: invoiceMeta } = data

      // CORPORATE B2B RESTRICTION: Only Net Banking allowed.
      // This keeps payment flow compliant for enterprise procurement controls.
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Procuro',
        description: `Payment for Invoice #${invoiceMeta.invoice_number}`,
        order_id: order.id,
        prefill: {
          name: invoiceMeta.supplier_name || 'Supplier',
          email: invoiceMeta.supplier_email || '',
        },
        notes: {
          invoice_id: String(invoiceMeta.invoice_id),
          invoice_number: String(invoiceMeta.invoice_number),
        },
        theme: { color: '#f59e0b' },
        // B2B only: allow bank-routed transfers and disable consumer methods.
        method: {
          netbanking: true,
          upi: false,
          wallet: false,
          card: false,
        },
        handler: async (response) => {
          await api.post(`/finance/invoices/${invoice.invoice_id}/verify-payment`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          setInvoices(prev => prev.map(inv => inv.invoice_id === invoice.invoice_id ? { ...inv, status: 'PAID' } : inv))
          await loadTimeline(invoice.invoice_id)
          setActionLoading(null)
        },
        modal: {
          ondismiss: async () => {
            try {
              await api.post(`/finance/invoices/${invoice.invoice_id}/payment-failed`, {
                error_description: 'Checkout dismissed by user',
              })
              await loadTimeline(invoice.invoice_id)
            } catch (_) {
              // no-op: checkout close should not block UI
            }
            setActionLoading(null)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', async (resp) => {
        const msg = resp?.error?.description || 'Payment failed. Please try again.'
        try {
          await api.post(`/finance/invoices/${invoice.invoice_id}/payment-failed`, {
            razorpay_payment_id: resp?.error?.metadata?.payment_id || null,
            razorpay_order_id: resp?.error?.metadata?.order_id || null,
            error_description: msg,
          })
          await loadTimeline(invoice.invoice_id)
        } catch (_) {
          // no-op: failed log should not block user feedback
        }
        setError(msg)
        setActionLoading(null)
      })
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to initiate payment')
      setActionLoading(null)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-title mb-1">Finance</p>
            <h1 className="page-title">Manage Invoices</h1>
            <p className="text-xs text-slate-500 mt-1">
              Review supplier invoices and process payments.
            </p>
          </div>
          <button 
            onClick={loadInvoices}
            className="text-xs text-amber-500 hover:underline"
          >
            🔄 Refresh List
          </button>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
          <EmptyState message="No invoices uploaded yet." />
        ) : (
          <div className="space-y-4">
            {invoices.map(inv => (
              <div key={inv.invoice_id} className="card bg-slate-800/20 border-slate-800">
                <div className="flex flex-col md:flex-row gap-6">
                  
                  {/* Left: Invoice Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${STATUS_BADGE[inv.status]}`}>
                          {inv.status}
                        </span>
                        <h3 className="text-slate-100 font-medium mt-1">Invoice #{inv.invoice_number}</h3>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Uploaded: {new Date(inv.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-0.5">Invoice Amount</p>
                        <p className="text-lg font-mono text-amber-400 font-bold">
                          ₹{parseFloat(inv.amount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded text-xs border border-slate-800/50">
                      <div>
                        <p className="text-slate-500 mb-1">Supplier</p>
                        <p className="text-slate-200">{inv.supplier_name || inv.Supplier?.name}</p>
                        {inv.company_name && <p className="text-slate-400 text-[10px]">{inv.company_name}</p>}
                        {inv.gstin && <p className="text-slate-400 text-[10px]">GSTIN: {inv.gstin}</p>}
                        <p className="text-slate-400 text-[10px]">{inv.Supplier?.email}</p>
                      </div>
                      <div>
                        <p className="section-title mb-1">Items</p>
                        <p className="text-slate-200">{inv.item_name || inv.PurchaseOrder?.RFQ?.PurchaseRequest?.item_name || 'Purchase Order Items'}</p>
                        <p className="text-slate-400 text-[10px]">{inv.po_number || `PO-${inv.po_id}`}</p>
                        <p className="text-slate-500 text-[10px]">
                          Ordered Qty: {inv.ordered_quantity ?? inv.PurchaseOrder?.RFQ?.PurchaseRequest?.quantity} · 
                          Delivered Qty: {inv.delivered_quantity ?? inv.quantity}
                          {(inv.delivered_quantity ?? inv.quantity) !== (inv.ordered_quantity ?? inv.PurchaseOrder?.RFQ?.PurchaseRequest?.quantity) && (
                            <span className="text-red-400 ml-1 font-bold">⚠️ MISMATCH</span>
                          )}
                        </p>
                        {inv.delivery_status && (
                          <p className={`text-[10px] mt-1 font-medium ${
                            inv.delivery_status === 'FULL_MATCH'
                              ? 'text-green-400'
                              : inv.delivery_status === 'PARTIAL_DELIVERY'
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }`}>
                            {inv.delivery_status === 'FULL_MATCH' ? 'Full Match' : inv.delivery_status === 'PARTIAL_DELIVERY' ? 'Partial Delivery' : 'Invalid'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/40 p-3 rounded text-[11px] border border-slate-800/50">
                      <div>
                        <p className="text-slate-500">Invoice Date</p>
                        <p className="text-slate-200">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Due Date</p>
                        <p className="text-slate-200">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Payment Terms</p>
                        <p className="text-slate-200">{inv.payment_terms || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Payment Method</p>
                        <p className="text-slate-200">{inv.payment_method || '-'}</p>
                      </div>
                    </div>

                    {/* Price Verification */}
                    {(() => {
                      const orderedQty = parseFloat((inv.ordered_quantity ?? inv.PurchaseOrder?.RFQ?.PurchaseRequest?.quantity) || 0);
                      const deliveredQty = parseFloat((inv.delivered_quantity ?? inv.quantity) || 0);
                      const prAmount = parseFloat(inv.PurchaseOrder?.RFQ?.PurchaseRequest?.total_amount || 0);
                      const invAmount = parseFloat(inv.amount);
                      const unitPrice = parseFloat(inv.unit_price || 0);
                      const subtotal = parseFloat(inv.subtotal || 0);
                      const taxPercent = parseFloat(inv.tax_percent || 0);
                      const expectedSubtotal = deliveredQty * unitPrice;
                      const subtotalMismatch = Math.abs(subtotal - expectedSubtotal) > 1;
                      const qtyInvalid = deliveredQty > orderedQty;
                      const isOverThreshold = invAmount > prAmount * 1.2;
                      const diffPct = prAmount > 0 ? ((invAmount - prAmount) / prAmount * 100).toFixed(1) : 0;
                      
                      return (
                        <div className={`p-3 rounded border ${isOverThreshold ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-900/30 border-slate-800/50'}`}>
                          <div className="flex justify-between items-center text-[10px] mb-2">
                            <span className="text-slate-500 uppercase tracking-wider font-semibold underline decoration-slate-700 underline-offset-4">Price Verification</span>
                            {isOverThreshold && (
                              <span className="bg-red-500 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                                Threshold Exceeded (+{diffPct}%)
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-baseline">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500">Original PR Amount</span>
                              <span className="text-xs font-mono text-slate-300">₹{prAmount.toLocaleString()}</span>
                            </div>
                            <div className="text-right flex flex-col">
                              <span className="text-[10px] text-slate-500">Invoice Amount</span>
                              <span className={`text-sm font-mono font-bold ${isOverThreshold ? 'text-red-400' : 'text-green-400'}`}>
                                ₹{invAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {(unitPrice > 0 || subtotal > 0 || taxPercent > 0) && (
                            <div className="mt-2 text-[10px] text-slate-400">
                              Unit Price: ₹{unitPrice.toLocaleString()} · Subtotal: ₹{subtotal.toLocaleString()} · Tax: {taxPercent}%
                            </div>
                          )}
                          {(qtyInvalid || subtotalMismatch) && (
                            <div className="mt-2 text-[10px] text-red-400">
                              {qtyInvalid ? 'Delivered quantity exceeds ordered quantity. ' : ''}
                              {subtotalMismatch ? `Subtotal mismatch (expected ~₹${expectedSubtotal.toFixed(2)} from Delivered Qty × Unit Price).` : ''}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {inv.details && (
                      <p className="text-xs text-slate-400 italic">"{inv.details}"</p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="md:w-64 space-y-3 shrink-0">
                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800/50 space-y-2 mb-3">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Verification Help</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        • Amount should be within 20% of PR price.<br/>
                        • Rejecting will move the Purchase Request back to **Procurement Officer**.
                      </p>
                    </div>
                    {inv.document_path ? (
                      <a 
                        href={`http://localhost:8000/uploads/${inv.document_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-3 rounded border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-medium hover:bg-amber-500/10 transition-colors"
                      >
                        📄 View Invoice Document
                      </a>
                    ) : (
                      <div className="p-3 rounded border border-slate-800 bg-slate-900 text-slate-500 text-xs text-center italic">
                        No document uploaded
                      </div>
                    )}

                    {inv.status === 'PENDING' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={actionLoading === inv.invoice_id}
                          onClick={() => openPaymentWindow(inv)}
                          className="btn-primary py-2 text-xs bg-green-600 hover:bg-green-500 border-green-700"
                        >
                          {actionLoading === inv.invoice_id ? '...' : 'Pay Now'}
                        </button>
                        <button
                          disabled={actionLoading === inv.invoice_id}
                          onClick={() => updateStatus(inv.invoice_id, 'REJECTED')}
                          className="btn-secondary py-2 text-xs border-red-900/50 text-red-500 hover:bg-red-900/10"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {inv.status !== 'PENDING' && (
                      <p className="text-[10px] text-center text-slate-600">
                        Processed on {new Date(inv.updatedAt).toLocaleDateString()}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleTimeline(inv.invoice_id)}
                      className="w-full text-[11px] py-2 rounded border border-slate-700 text-slate-300 hover:bg-slate-800/50"
                    >
                      {expandedTimeline[inv.invoice_id] ? 'Hide Timeline' : 'View Timeline'}
                    </button>

                    {expandedTimeline[inv.invoice_id] && (
                      <div className="mt-2 p-3 rounded border border-slate-800 bg-slate-900/40 space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                          Request - Invoice - Approval - Payment - Completed
                        </p>

                        {timelineLoading[inv.invoice_id] ? (
                          <p className="text-[11px] text-slate-400">Loading timeline...</p>
                        ) : (transactionLogs[inv.invoice_id] || []).length === 0 ? (
                          <p className="text-[11px] text-slate-500">No transaction logs yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {(transactionLogs[inv.invoice_id] || []).map((log) => (
                              <div key={log.transaction_id} className="pl-3 border-l border-slate-700/80">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded border ${TX_STATUS_BADGE[log.status] || 'bg-slate-800 text-slate-200 border-slate-700'}`}>
                                    {log.status}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-200 mt-1">
                                  {(log.action || '').replace(/_/g, ' ')}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  By: {log.performed_by || 'System'}
                                </p>
                                {log.remarks && (
                                  <p className="text-[10px] text-slate-500 italic">{log.remarks}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
