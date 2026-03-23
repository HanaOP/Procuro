/**
 * UploadInvoice.jsx
 * Supplier page — form to upload an invoice for a specific PO
 * Route: /supplier/orders/:po_id/upload-invoice
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, ErrorAlert } from '../../components/Feedback'
import api from '../../api/axiosInstance'

export default function UploadInvoice() {
  const { po_id } = useParams()
  const navigate = useNavigate()
  
  const [po, setPo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    amount: '',
    quantity: '',
    details: '',
  })
  const [file, setFile] = useState(null)

  useEffect(() => {
    // Fetch PO details to show on form
    api.get('/supplier/orders')
      .then(({ data }) => {
        const found = data.find(o => o.po_id === parseInt(po_id))
        if (!found) setError('Purchase Order not found or unauthorized')
        else {
          setPo(found)
          // Generate Invoice Number on Load
          const year = new Date().getFullYear();
          const random = Math.random().toString(36).substring(2, 7).toUpperCase();
          const invNum = `INV-${year}-${random}`;
          
          setFormData(prev => ({ 
            ...prev, 
            invoice_number: invNum,
            amount: found.total_amount,
            quantity: found.RFQ?.PurchaseRequest?.quantity || ''
          }))
        }
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load PO details'))
      .finally(() => setLoading(false))
  }, [po_id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const data = new FormData()
    data.append('po_id', po_id)
    data.append('invoice_number', formData.invoice_number)
    data.append('amount', formData.amount)
    data.append('quantity', formData.quantity)
    data.append('details', formData.details)
    if (file) data.append('invoice_document', file)

    try {
      await api.post('/supplier/invoice', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccess('Invoice uploaded successfully!')
      setTimeout(() => navigate('/supplier/orders'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload invoice')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link to="/supplier/orders" className="text-xs text-amber-500 hover:underline">← Back to Orders</Link>
          <h1 className="page-title mt-2">Upload Invoice</h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit your invoice for PO #{po_id}
          </p>
        </div>

        {error && <ErrorAlert message={error} />}
        {success && (
          <div className="bg-green-900/20 border border-green-800/40 rounded p-4 text-center">
            <p className="text-green-400 font-medium">{success}</p>
            <p className="text-xs text-green-500 mt-1">Redirecting back to orders...</p>
          </div>
        )}

        {po && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="card bg-slate-800/30 border-slate-800 space-y-4">
              
              {/* Info Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">New Invoice Submission</span>
              </div>

              {/* Invoice Number (Auto-generated & Displayed) */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  Invoice Number
                  <span className="text-[10px] text-amber-500/60 font-normal italic">Auto-generated</span>
                </label>
                <input
                  type="text"
                  readOnly
                  className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-amber-500/80 font-mono cursor-not-allowed"
                  value={formData.invoice_number}
                />
              </div>

              {/* PO Summary */}
              <div className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-500 mb-0.5">Purchase Order Item</p>
                  <p className="text-slate-200 font-medium">
                    {po.RFQ?.PurchaseRequest?.item_name || 'Purchase Order'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 mb-0.5">PO Expected Amount</p>
                  <p className="text-green-400 font-bold font-mono text-sm">
                    ₹{parseFloat(po.total_amount).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Invoice Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5 opacity-80">
                <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  Quantity Supplied (Fixed)
                  <span className="text-[10px] text-amber-500/60 font-normal italic">Matches original PR</span>
                </label>
                <input
                  type="number"
                  readOnly
                  className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-400 font-mono cursor-not-allowed"
                  value={formData.quantity}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium text-amber-500">Invoice Document (PDF/Image) *</label>
                <div className="relative border-2 border-dashed border-slate-800 rounded-lg p-6 text-center hover:border-amber-500/30 transition-colors">
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={e => setFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className="text-sm text-slate-300">
                      {file ? file.name : "Click or drag to upload invoice document"}
                    </p>
                    <p className="text-[10px] text-slate-500">Supported formats: PDF, PNG, JPG</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Supply Details / Remarks</label>
                <textarea
                  rows="3"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                  placeholder="Any additional info about the supply..."
                  value={formData.details}
                  onChange={e => setFormData({ ...formData, details: e.target.value })}
                ></textarea>
              </div>

            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
            >
              {submitting ? <LoadingSpinner /> : "Submit Invoice for Payment"}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
