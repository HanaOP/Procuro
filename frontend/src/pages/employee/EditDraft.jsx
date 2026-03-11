import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDrafts, updateDraft, createRequest } from '../../api/employeeApi'
import AppLayout from '../../components/AppLayout'
import { ErrorAlert, SuccessAlert, LoadingSpinner } from '../../components/Feedback'

const CATEGORIES = ['IT', 'Office Supplies', 'Furniture', 'Hardware', 'Software', 'Maintenance', 'Other']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']

export default function EditDraft() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(null)

  useEffect(() => {
    getDrafts()
      .then(({ data }) => {
        const draft = data.find(d => String(d.pr_id) === String(id))
        if (!draft) { navigate('/employee/drafts'); return }
        setForm({
          item_name: draft.item_name || '',
          item_details: draft.item_details || '',
          quantity: draft.quantity || '',
          estimated_unit_price: draft.estimated_unit_price || '',
          category: draft.category || '',
          required_by: draft.required_by ? draft.required_by.split('T')[0] : '',
          priority: draft.priority || 'MEDIUM',
          department: draft.department || '',
        })
      })
      .catch(() => navigate('/employee/drafts'))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const totalAmount = form?.quantity && form?.estimated_unit_price
    ? (parseFloat(form.quantity) * parseFloat(form.estimated_unit_price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '—'

  const handleSaveDraft = async () => {
    setSaving(true); setError('')
    try {
      await updateDraft(id, { ...form, quantity: parseInt(form.quantity), estimated_unit_price: parseFloat(form.estimated_unit_price) })
      setSuccess('Draft updated.')
    } catch (err) { setError(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const handleSubmit = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, quantity: parseInt(form.quantity), estimated_unit_price: parseFloat(form.estimated_unit_price) }
      await createRequest(payload, false)
      setSuccess('Submitted for manager approval.')
      setTimeout(() => navigate('/employee/requests'), 1500)
    } catch (err) { setError(err.response?.data?.error || 'Failed to submit') }
    finally { setSaving(false) }
  }

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>
  if (!form) return null

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <p className="section-title mb-1">Employee · Drafts</p>
          <h1 className="page-title">Edit Draft #{id}</h1>
        </div>

        <div className="card space-y-5">
          <div className="space-y-4">
            <div>
              <label className="label">Item Name</label>
              <input name="item_name" value={form.item_name} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Item Details</label>
              <textarea name="item_details" value={form.item_details} onChange={handleChange}
                className="input-field resize-none" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="input-field">
                  <option value="">Select</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-900">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange} className="input-field">
                  {PRIORITIES.map(p => <option key={p} value={p} className="bg-surface-900">{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity</label>
                <input name="quantity" type="number" min="1" max="100" value={form.quantity} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">Unit Price (₹)</label>
                <input name="estimated_unit_price" type="number" min="0" step="0.01" value={form.estimated_unit_price} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <div className="px-4 py-3 bg-surface-800 border border-surface-600 flex justify-between items-center">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Total</span>
              <span className="font-mono text-amber-400 text-lg font-medium">₹{totalAmount}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Department</label>
                <input name="department" value={form.department} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">Required By</label>
                <input name="required_by" type="date" value={form.required_by} onChange={handleChange} className="input-field"
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} />
              </div>
            </div>
          </div>

          {error && <ErrorAlert message={error} />}
          {success && <SuccessAlert message={success} />}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">Submit Request</button>
            <button onClick={handleSaveDraft} disabled={saving} className="btn-secondary">Save Draft</button>
            <button onClick={() => navigate('/employee/drafts')} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
