import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getApprovedRequests } from '../../api/procurementApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'

export default function ProcurementDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getApprovedRequests()
      .then(({ data }) => setRequests(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const readyForRFQ = requests.filter(r => r.status === 'PENDING_PROCUREMENT').length
  const rfqSent = requests.filter(r => r.status === 'RFQ_SENT').length

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="section-title mb-1">Dashboard</p>
          <h1 className="page-title">Procurement Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome, {user?.name}</p>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Ready for RFQ',   value: readyForRFQ, alert: readyForRFQ > 0, path: '/procurement/requests' },
              { label: 'RFQ Sent',        value: rfqSent,     path: '/procurement/requests' },
              { label: 'Total In Pipeline', value: requests.length, path: '/procurement/requests' },
            ].map(s => (
              <Link key={s.label} to={s.path}
                className={`card hover:border-amber-800/40 transition-colors block ${s.alert ? 'border-amber-800/50' : ''}`}>
                <p className="section-title mb-2">{s.label}</p>
                <p className={`font-mono text-2xl font-medium ${s.alert ? 'text-amber-400' : 'text-slate-100'}`}>{s.value}</p>
              </Link>
            ))}
          </div>
        )}
        <div>
          <p className="section-title mb-3">Actions</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/procurement/requests" className="btn-primary">View Approved PRs</Link>
            <Link to="/procurement/rfq" className="btn-secondary">Send RFQ</Link>
            <Link to="/procurement/orders" className="btn-secondary">Mark Delivered</Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
