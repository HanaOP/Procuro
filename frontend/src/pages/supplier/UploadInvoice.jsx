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
import { useAuth } from '../../context/AuthContext'

function getLocalDateString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function UploadInvoice() {
  const { po_id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [po, setPo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [alreadyUploaded, setAlreadyUploaded] = useState(null)
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: getLocalDateString(),
    due_date: '',
    supplier_name: '',
    company_name: '',
    gstin: '',
    po_number: '',
    item_name: '',
    ordered_quantity: '',
    delivered_quantity: '',
    unit_price: '',
    subtotal: '',
    tax_percent: '0',
    total_invoice_amount: '',
    payment_terms: 'Net 15 days',
    payment_method: 'Bank Transfer',
    remarks: '',
  })
  const [file, setFile] = useState(null)
  const todayStr = getLocalDateString()

  const orderedQtyNum = parseInt(formData.ordered_quantity || 0, 10) || 0
  const deliveredQtyNum = parseInt(formData.delivered_quantity || 0, 10) || 0
  const unitPriceNum = parseFloat(formData.unit_price) || 0
  const taxPercentNum = parseFloat(formData.tax_percent) || 0
  const subtotalCalc = parseFloat((deliveredQtyNum * unitPriceNum).toFixed(2))
  const totalCalc = parseFloat((subtotalCalc + (subtotalCalc * (taxPercentNum || 0) / 100)).toFixed(2))

  const quantityInvalid = orderedQtyNum > 0 && deliveredQtyNum > orderedQtyNum
  const isPartialDelivery = orderedQtyNum > 0 && deliveredQtyNum > 0 && deliveredQtyNum < orderedQtyNum
  const isFullMatch = orderedQtyNum > 0 && deliveredQtyNum === orderedQtyNum
  const quantityRequiredMissing = !formData.delivered_quantity
  const unitPriceMissing = !formData.unit_price
  const invoiceDateMissing = !formData.invoice_date
  const invoiceDatePast = Boolean(formData.invoice_date) && formData.invoice_date < todayStr
  const invoiceNumberMissing = !formData.invoice_number
  const hardValidationError = quantityRequiredMissing || unitPriceMissing || invoiceDateMissing || invoiceNumberMissing || quantityInvalid || invoiceDatePast

  const statusIndicator = quantityInvalid
    ? { label: 'Invalid', cls: 'text-red-400 bg-red-900/20 border-red-800/40' }
    : isPartialDelivery
      ? { label: 'Partial Delivery', cls: 'text-amber-400 bg-amber-900/20 border-amber-800/40' }
      : isFullMatch
        ? { label: 'Full Match', cls: 'text-green-400 bg-green-900/20 border-green-800/40' }
        : { label: 'Awaiting Input', cls: 'text-slate-400 bg-slate-900/20 border-slate-800/40' }

  useEffect(() => {
    // Fetch PO details to show on form
    api.get('/supplier/orders')
      .then(({ data }) => {
        const found = data.find(o => o.po_id === parseInt(po_id))
        if (!found) setError('Purchase Order not found or unauthorized')
        else {
          if (found.invoice_uploaded || found.latest_invoice) {
            setAlreadyUploaded(found.latest_invoice || found.Invoices?.[0] || null)
            setPo(found)
            return
          }

          setPo(found)
          // Generate Invoice Number on Load
          const year = new Date().getFullYear()
          const random = Math.random().toString(36).substring(2, 7).toUpperCase()
          const invNum = `INV-${year}-${random}`
          const poAmount = parseFloat(found.total_amount || 0).toFixed(2)
          const poQty = found.RFQ?.PurchaseRequest?.quantity || ''
          
          setFormData(prev => ({ 
            ...prev, 
            invoice_number: invNum,
            supplier_name: user?.name || '',
            po_number: `PO-${found.po_id}`,
            item_name: found.RFQ?.PurchaseRequest?.item_name || '',
            ordered_quantity: poQty,
            delivered_quantity: poQty,
            unit_price: poQty ? (parseFloat(found.total_amount) / parseFloat(poQty)).toFixed(2) : poAmount,
            subtotal: poAmount,
            total_invoice_amount: poAmount,
          }))
        }
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load PO details'))
      .finally(() => setLoading(false))
  }, [po_id, user])

  useEffect(() => {
    if (!formData.delivered_quantity || !formData.unit_price) return
    setFormData(prev => ({
      ...prev,
      subtotal: subtotalCalc.toFixed(2),
      total_invoice_amount: totalCalc.toFixed(2),
    }))
  }, [formData.delivered_quantity, formData.unit_price, formData.tax_percent])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (!file) {
      setSubmitting(false)
      setError('Official invoice document is required')
      return
    }

    if (quantityInvalid) {
      setSubmitting(false)
      setError(`Delivered quantity cannot exceed ordered quantity (${orderedQtyNum}).`)
      return
    }

    if (invoiceDatePast) {
      setSubmitting(false)
      setError('Invoice date cannot be in the past.')
      return
    }

    const data = new FormData()
    data.append('po_id', po_id)
    data.append('invoice_number', formData.invoice_number)
    data.append('invoice_date', formData.invoice_date)
    data.append('due_date', formData.due_date)
    data.append('supplier_name', formData.supplier_name)
    data.append('company_name', formData.company_name)
    data.append('gstin', formData.gstin)
    data.append('po_number', formData.po_number)
    data.append('item_name', formData.item_name)
    data.append('ordered_quantity', formData.ordered_quantity)
    data.append('delivered_quantity', formData.delivered_quantity)
    data.append('unit_price', formData.unit_price)
    data.append('subtotal', formData.subtotal)
    data.append('tax_percent', formData.tax_percent)
    data.append('total_invoice_amount', formData.total_invoice_amount)
    data.append('payment_terms', formData.payment_terms)
    data.append('payment_method', formData.payment_method)
    data.append('remarks', formData.remarks)
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

        {po && alreadyUploaded && (
          <div className="card bg-blue-900/10 border-blue-800/40">
            <p className="text-blue-400 font-medium text-sm">Invoice already uploaded for this purchase order.</p>
            <p className="text-xs text-slate-400 mt-1">
              Invoice: {alreadyUploaded.invoice_number || '—'}
              {alreadyUploaded.createdAt ? ` · Uploaded on ${new Date(alreadyUploaded.createdAt).toLocaleDateString()}` : ''}
            </p>
            <div className="mt-3">
              <Link to="/supplier/orders" className="btn-secondary text-xs px-3 py-1.5 inline-block">
                Back to Orders
              </Link>
            </div>
          </div>
        )}

        {po && !success && !alreadyUploaded && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="card bg-slate-800/30 border-slate-800 space-y-4">

              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">New Invoice Submission</span>
              </div>

              <div>
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-800/40 rounded p-3">
                  Please provide accurate invoice details as per your official billing document. Ensure that the information entered matches the uploaded invoice file for verification and payment processing. Any mismatch may delay approval.
                </p>
              </div>

              <p className="section-title">Basic Information</p>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  Invoice Number
                  <span className="text-[10px] text-amber-500/60 font-normal italic">Auto-generated, editable</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-amber-500/90 font-mono focus:outline-none focus:border-amber-500/50"
                  value={formData.invoice_number}
                  onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                    value={formData.invoice_date}
                    onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                  />
                  {invoiceDatePast && (
                    <p className="text-[11px] text-red-400">Past invoice date is not allowed.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Due Date (Optional)</label>
                  <input
                    type="date"
                    min={formData.invoice_date || todayStr}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <p className="section-title">Supplier Information</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Supplier Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                    value={formData.supplier_name}
                    onChange={e => setFormData({ ...formData, supplier_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Company Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                    value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">GSTIN</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                    value={formData.gstin}
                    onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <p className="section-title">Order Reference</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Purchase Order (PO) Number</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 font-mono cursor-not-allowed"
                    value={formData.po_number}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Item Name</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                    value={formData.item_name}
                  />
                </div>
              </div>

              <p className="section-title">Billing Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Ordered Quantity (PO)</label>
                  <input
                    type="number"
                    readOnly
                    className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 font-mono cursor-not-allowed"
                    value={formData.ordered_quantity}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Delivered Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none ${quantityInvalid ? 'border-red-700' : 'border-slate-800 focus:border-amber-500/50'}`}
                    value={formData.delivered_quantity}
                    onChange={e => setFormData({ ...formData, delivered_quantity: e.target.value })}
                  />
                  {quantityInvalid && (
                    <p className="text-[11px] text-red-400">Delivered Quantity must be less than or equal to Ordered Quantity.</p>
                  )}
                  {!quantityInvalid && isPartialDelivery && (
                    <p className="text-[11px] text-amber-400">Delivered Quantity is lower than Ordered Quantity. This will be submitted as Partial Delivery.</p>
                  )}
                  {!quantityInvalid && isFullMatch && (
                    <p className="text-[11px] text-green-400">Delivered Quantity matches Ordered Quantity.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
                    value={formData.unit_price}
                    onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Subtotal (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 font-mono cursor-not-allowed"
                    value={formData.subtotal}
                  />
                  <p className="text-[11px] text-slate-500">Auto-calculated as Delivered Quantity × Unit Price</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Tax (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
                    value={formData.tax_percent}
                    onChange={e => setFormData({ ...formData, tax_percent: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs text-slate-400 font-medium">Total Invoice Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    readOnly
                    className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 font-mono cursor-not-allowed"
                    value={formData.total_invoice_amount}
                  />
                  <p className="text-[11px] text-slate-500">Auto-calculated from subtotal + tax</p>
                </div>
                <div className="md:col-span-2">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-medium ${statusIndicator.cls}`}>
                    Delivery Status: {statusIndicator.label}
                  </div>
                </div>
                {(quantityInvalid || isPartialDelivery) && (
                  <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded p-3 text-xs space-y-1">
                    <p className="text-slate-300 font-medium">Invoice Validation</p>
                    <p className={`${quantityInvalid ? 'text-red-400' : 'text-slate-400'}`}>
                      Ordered Quantity: {orderedQtyNum || '-'} | Delivered Quantity: {deliveredQtyNum || '-'}
                    </p>
                    {isPartialDelivery && !quantityInvalid && (
                      <p className="text-amber-400">Partial Delivery detected: invoice is allowed but will be marked as Partial Delivery.</p>
                    )}
                  </div>
                )}
              </div>

              <p className="section-title">Payment Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Payment Terms</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                    value={formData.payment_terms}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Payment Method</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                    value={formData.payment_method}
                    onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                  />
                </div>
              </div>

              <p className="section-title">Additional Notes</p>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Remarks / Supply Details (Optional)</label>
                <textarea
                  rows="3"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50"
                  placeholder="Any additional info about the supply..."
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                ></textarea>
              </div>

              <p className="section-title">Upload</p>
              <p className="text-xs text-slate-400 bg-slate-900/40 border border-slate-800 rounded p-3">
                Upload the official invoice document (PDF/Image) containing item details, pricing, tax breakdown, and supplier authorization. This document will be used for verification and payment approval.
              </p>
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
            </div>

            <button
              type="submit"
              disabled={submitting || hardValidationError}
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
