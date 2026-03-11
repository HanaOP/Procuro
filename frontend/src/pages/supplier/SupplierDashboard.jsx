import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { viewOpenRFQs, myQuotations } from '../../api/supplierApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'

export default function SupplierDashboard() {
  const { user } = useAuth()
  const [openRFQs, setOpenRFQs] = useState([])
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([viewOpenRFQs(), myQuotations()])
      .then(([rfqs, qs]) => {
        setOpenRFQs(rfqs.value?.data || [])
        setQuotes(qs.value?.data || [])
      }).finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="section-title mb-1">Dashboard</p>
          <h1 className="page-title">Supplier Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome, {user?.name}</p>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 gap-3">
            <Link to="/supplier/rfqs"
              className={`card hover:border-amber-800/40 transition-colors block ${openRFQs.length > 0 ? 'border-amber-800/50' : ''}`}>
              <p className="section-title mb-2">Open RFQs</p>
              <p className={`font-mono text-2xl font-medium ${openRFQs.length > 0 ? 'text-amber-400' : 'text-slate-100'}`}>{openRFQs.length}</p>
            </Link>
            <Link to="/supplier/quotations" className="card hover:border-surface-600 transition-colors block">
              <p className="section-title mb-2">My Quotations</p>
              <p className="font-mono text-2xl font-medium text-slate-100">{quotes.length}</p>
            </Link>
          </div>
        )}
        <div>
          <p className="section-title mb-3">Actions</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/supplier/rfqs" className="btn-primary">Browse Open RFQs</Link>
            <Link to="/supplier/quote" className="btn-secondary">Submit Quotation</Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
