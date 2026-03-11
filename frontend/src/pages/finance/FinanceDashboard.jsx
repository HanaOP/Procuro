import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPendingRequests } from '../../api/financeApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'

export default function FinanceDashboard() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPendingRequests()
      .then(({ data }) => setPending(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalValue = pending.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0)

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="section-title mb-1">Dashboard</p>
          <h1 className="page-title">Finance Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome, {user?.name}</p>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 gap-3">
            <Link to="/finance/pending"
              className={`card hover:border-amber-800/40 transition-colors block ${pending.length > 0 ? 'border-amber-800/50' : ''}`}>
              <p className="section-title mb-2">Awaiting Approval</p>
              <p className={`font-mono text-2xl font-medium ${pending.length > 0 ? 'text-amber-400' : 'text-slate-100'}`}>{pending.length}</p>
            </Link>
            <div className="card">
              <p className="section-title mb-2">Total Pending Value</p>
              <p className="font-mono text-2xl font-medium text-slate-100">₹{totalValue.toLocaleString()}</p>
            </div>
          </div>
        )}
        <div>
          <p className="section-title mb-3">Actions</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/finance/pending" className="btn-primary">Review Requests</Link>
            <Link to="/finance/budget" className="btn-secondary">Allocate Budget</Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
