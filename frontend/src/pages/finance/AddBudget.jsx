import { useState } from 'react'
import { addBudget } from '../../api/financeApi'
import AppLayout from '../../components/AppLayout'
import { ErrorAlert, SuccessAlert } from '../../components/Feedback'

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'IT', 'Legal', 'Admin', 'Sales']
const CURRENT_YEAR = new Date().getFullYear()
const FISCAL_YEARS = [`${CURRENT_YEAR}-${CURRENT_YEAR + 1}`, `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`]

export default function AddBudget() {
  const [form, setForm] = useState({
    department: '',
    total_allocated: '',
    financial_year: FISCAL_YEARS[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await addBudget(form)
      setSuccess(`Budget of ₹${parseFloat(form.total_allocated).toLocaleString()} allocated to ${form.department} for FY ${form.financial_year}.`)
      setForm({ department: '', total_allocated: '', financial_year: FISCAL_YEARS[0] })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add budget')
    } finally { setLoading(false) }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-md">
        <div>
          <p className="section-title mb-1">Finance</p>
          <h1 className="page-title">Allocate Department Budget</h1>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Department *</label>
              <select name="department" value={form.department} onChange={handleChange} className="input-field" required>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-surface-900">{d}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Financial Year *</label>
              <select name="financial_year" value={form.financial_year} onChange={handleChange} className="input-field">
                {FISCAL_YEARS.map(y => <option key={y} value={y} className="bg-surface-900">FY {y}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Total Budget (₹) *</label>
              <input name="total_allocated" type="number" min="1" step="0.01"
                value={form.total_allocated} onChange={handleChange}
                className="input-field" placeholder="500000" required />
            </div>

            {form.total_allocated && (
              <div className="px-4 py-3 bg-surface-800 border border-surface-600 flex justify-between">
                <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Allocation Preview</span>
                <span className="font-mono text-amber-400 font-medium">
                  ₹{parseFloat(form.total_allocated || 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {error && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Allocating...' : 'Allocate Budget'}
              </button>
            </div>
          </form>
        </div>

        <div className="card bg-surface-800/50">
          <p className="section-title mb-2">Note</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Once allocated, the budget will be available for employee purchase requests in that department.
            Budget is tracked automatically as finance approves requests.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
