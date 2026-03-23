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

export default function ManageInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // invoice_id

  useEffect(() => {
    loadInvoices()
  }, [])

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
                        <p className="text-slate-200">{inv.Supplier?.name}</p>
                        <p className="text-slate-400 text-[10px]">{inv.Supplier?.email}</p>
                      </div>
                      <div>
                        <p className="section-title mb-1">Items</p>
                        <p className="text-slate-200">
                          {inv.PurchaseOrder?.RFQ?.PurchaseRequest?.item_name || 'Purchase Order Items'}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          Original Qty: {inv.PurchaseOrder?.RFQ?.PurchaseRequest?.quantity} · 
                          Invoice Qty: {inv.quantity}
                          {inv.quantity !== inv.PurchaseOrder?.RFQ?.PurchaseRequest?.quantity && (
                            <span className="text-red-400 ml-1 font-bold">⚠️ MISMATCH</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Price Verification */}
                    {(() => {
                      const prAmount = parseFloat(inv.PurchaseOrder?.RFQ?.PurchaseRequest?.total_amount || 0);
                      const invAmount = parseFloat(inv.amount);
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
                        href={`http://localhost:5000/uploads/${inv.document_path}`}
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
                          onClick={() => updateStatus(inv.invoice_id, 'PAID')}
                          className="btn-primary py-2 text-xs bg-green-600 hover:bg-green-500 border-green-700"
                        >
                          {actionLoading === inv.invoice_id ? '...' : 'Mark Paid'}
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
