import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getApprovedRequests } from '../../api/procurementApi'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner } from '../../components/Feedback'
import axios from 'axios'
import api from '../../api/axiosInstance'

const predApi = axios.create({ baseURL: 'http://localhost:8001' })

const DEPARTMENTS = ['All', 'Engineering', 'IT', 'Operations', 'Administration', 'HR']

const getDashboard     = (dept) => predApi.get(`/summary/dashboard/${encodeURIComponent(dept)}`)
const getAllPredictions = ()     => predApi.get('/predict/all')
const getAllAnomalies   = ()     => predApi.get('/anomalies/all')
const getTopItems      = ()     => predApi.get('/summary/top-items?limit=10')
const getReorderAlerts = ()     => predApi.get('/summary/reorder-alerts')
const getDeptAnomalies = (dept) => predApi.get(`/anomalies/department/${encodeURIComponent(dept)}`)
const getDeptPred      = (dept) => predApi.get(`/predict/department/${encodeURIComponent(dept)}`)

function StatCard({ label, value, sub, alert, path }) {
  const content = (
    <div className={`card ${alert ? 'border-amber-800/50' : ''}`}>
      <p className="section-title mb-2">{label}</p>
      <p className={`font-mono text-2xl font-medium ${alert ? 'text-amber-400' : 'text-slate-100'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
  return path ? <Link to={path} className="hover:border-amber-800/40 transition-colors block">{content}</Link> : content
}

function TrendBadge({ trend }) {
  if (!trend) return null
  const color = trend.includes('↑') ? 'text-green-400' : trend.includes('↓') ? 'text-red-400' : 'text-slate-400'
  return <span className={`text-xs font-mono ${color}`}>{trend}</span>
}

function ConfidenceBadge({ confidence }) {
  const map = { HIGH: 'bg-green-900/40 text-green-400', MEDIUM: 'bg-amber-900/40 text-amber-400', LOW: 'bg-slate-700 text-slate-300', VERY_LOW: 'bg-slate-700 text-slate-500' }
  return <span className={`text-xs px-2 py-0.5 rounded font-mono ${map[confidence] || map.LOW}`}>{confidence}</span>
}

function SeverityBadge({ severity }) {
  const map = { HIGH: 'bg-red-900/40 text-red-400', MEDIUM: 'bg-amber-900/40 text-amber-400', LOW: 'bg-slate-700 text-slate-300' }
  return <span className={`text-xs px-2 py-0.5 rounded font-mono ${map[severity] || map.LOW}`}>{severity}</span>
}

export default function ProcurementDashboard() {
  const { user } = useAuth()
  const [requests, setRequests]           = useState([])
  const [selectedDept, setSelectedDept]   = useState('All')
  const [predictions, setPredictions]     = useState([])
  const [anomalies, setAnomalies]         = useState(null)
  const [topItems, setTopItems]           = useState([])
  const [reorderAlerts, setReorderAlerts] = useState([])
  const [deptData, setDeptData]           = useState(null)
  const [loading, setLoading]             = useState(true)
  const [aiLoading, setAiLoading]         = useState(true)
  const [deptLoading, setDeptLoading]     = useState(false)
  const [activeTab, setActiveTab]         = useState('predictions')
  const [quotationCount, setQuotationCount] = useState(0)

  // Load procurement requests
  useEffect(() => {
    getApprovedRequests()
      .then(({ data }) => setRequests(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Load quotation count from all RFQs (RFQ_SENT, SUPPLIER_SELECTED, ORDER_PLACED)
  useEffect(() => {
    api.get('/procurement/requests')
      .then(({ data }) => {
        const rfqPRs = data.filter(r => ['RFQ_SENT', 'SUPPLIER_SELECTED', 'ORDER_PLACED'].includes(r.status))
        setQuotationCount(rfqPRs.length)
      })
      .catch(console.error)
  }, [])

  // Load all-department AI data
  useEffect(() => {
    Promise.allSettled([
      getAllPredictions(),
      getAllAnomalies(),
      getTopItems(),
      getReorderAlerts(),
    ]).then(([pred, anom, top, reorder]) => {
      if (pred.status === 'fulfilled')    setPredictions(pred.value.data?.predictions || [])
      if (anom.status === 'fulfilled')    setAnomalies(anom.value.data)
      if (top.status === 'fulfilled')     setTopItems(top.value.data?.top_items || [])
      if (reorder.status === 'fulfilled') setReorderAlerts(reorder.value.data?.alerts || [])
    }).finally(() => setAiLoading(false))
  }, [])

  // Load specific department data when selected
  useEffect(() => {
    if (selectedDept === 'All') {
      setDeptData(null)
      return
    }
    setDeptLoading(true)
    Promise.allSettled([
      getDashboard(selectedDept),
      getDeptAnomalies(selectedDept),
      getDeptPred(selectedDept),
    ]).then(([dash, anom, pred]) => {
      setDeptData({
        dashboard:   dash.status === 'fulfilled' ? dash.value.data : null,
        anomalies:   anom.status === 'fulfilled' ? anom.value.data : null,
        predictions: pred.status === 'fulfilled' ? pred.value.data?.predictions || [] : [],
      })
    }).finally(() => setDeptLoading(false))
  }, [selectedDept])

  const readyForRFQ = requests.filter(r => r.status === 'PENDING_PROCUREMENT').length
  const rfqSent     = requests.filter(r => r.status === 'RFQ_SENT').length

  // Use dept-specific or all data based on selection
  const displayPredictions = selectedDept === 'All' ? predictions : (deptData?.predictions || [])
  const displayAnomalies   = selectedDept === 'All' ? anomalies   : deptData?.anomalies
  const displayAlerts      = selectedDept === 'All' ? reorderAlerts : reorderAlerts.filter(a => a.department === selectedDept)
  const displayTopItems    = selectedDept === 'All' ? topItems : topItems.filter(i => predictions.filter(p => p.department === selectedDept && p.item_name === i.item_name).length > 0)

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="section-title mb-1">Dashboard</p>
            <h1 className="page-title">Procurement Portal</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome, {user?.name}</p>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Ready for RFQ"     value={readyForRFQ} alert={readyForRFQ > 0} path="/procurement/requests" />
            <StatCard label="RFQ Sent"          value={rfqSent}     path="/procurement/requests" />
            <StatCard
              label="View Quotations"
              value={quotationCount}
              alert={quotationCount > 0}
              path="/procurement/view-quotations"
              sub="RFQs with activity"
            />
            <StatCard label="Total in Pipeline" value={requests.length} path="/procurement/requests" />
            <StatCard
              label="Anomalies Detected"
              value={anomalies?.total_anomalies || 0}
              sub={`${anomalies?.total_scanned || 0} scanned`}
              alert={(anomalies?.total_anomalies || 0) > 0}
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div>
          <p className="section-title mb-3">Actions</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/procurement/requests" className="btn-primary">View Approved PRs</Link>
            <Link to="/procurement/view-quotations" className="btn-primary flex items-center gap-2"><span>📄</span> View Quotations</Link>
            <Link to="/procurement/supplier-approvals" className="btn-secondary flex items-center gap-2"><span>⏳</span> Track Approvals</Link>
            <Link to="/procurement/rfq" className="btn-secondary">Send RFQ</Link>
            <Link to="/procurement/orders" className="btn-secondary">Mark Delivered</Link>
          </div>
        </div>

        {/* ── AI Section ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title mb-1">AI Analysis</p>
              <p className="text-xs text-slate-500">Powered by Prophet + Isolation Forest</p>
            </div>

            {/* Department Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Department:</span>
              <div className="flex gap-1 flex-wrap">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                      selectedDept === dept
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Department Summary Card */}
          {selectedDept !== 'All' && deptData?.dashboard && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Requests Analyzed"
                value={deptData.dashboard.total_requests_analyzed || 0}
                sub={`${selectedDept} dept`}
              />
              <StatCard
                label="Items Predicted"
                value={deptData.predictions?.length || 0}
                sub="demand forecasts"
              />
              <StatCard
                label="Anomalies"
                value={deptData.anomalies?.total_anomalies || 0}
                sub={`${deptData.anomalies?.total_scanned || 0} scanned`}
                alert={(deptData.anomalies?.total_anomalies || 0) > 0}
              />
              <StatCard
                label="Est. Next Spend"
                value={deptData.dashboard.spend_forecast ? `$${deptData.dashboard.spend_forecast.next_order_estimate?.toLocaleString()}` : '—'}
                sub={deptData.dashboard.spend_forecast?.trend || ''}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-800 mb-6">
            {[
              { id: 'predictions', label: 'Demand Predictions' },
              { id: 'anomalies',   label: `Anomalies (${displayAnomalies?.total_anomalies || 0})` },
              { id: 'reorder',     label: `Reorder Alerts (${displayAlerts.length})` },
              { id: 'top',         label: 'Top Items' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {aiLoading || deptLoading ? <LoadingSpinner /> : (
            <>
              {/* Demand Predictions */}
              {activeTab === 'predictions' && (
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                        {selectedDept === 'All' && <th className="text-left p-3">Department</th>}
                        <th className="text-left p-3">Item</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Predicted Qty</th>
                        <th className="text-right p-3">Avg Price</th>
                        <th className="text-right p-3">Est. Spend</th>
                        <th className="text-center p-3">Trend</th>
                        <th className="text-center p-3">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPredictions.length === 0 ? (
                        <tr><td colSpan={8} className="p-4 text-center text-slate-500">No predictions available</td></tr>
                      ) : displayPredictions.slice(0, 20).map((p, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          {selectedDept === 'All' && <td className="p-3 text-slate-400">{p.department}</td>}
                          <td className="p-3 text-slate-100 font-medium">{p.item_name}</td>
                          <td className="p-3 text-slate-400">{p.category}</td>
                          <td className="p-3 text-right font-mono text-amber-400">{p.predicted_quantity}</td>
                          <td className="p-3 text-right font-mono text-slate-300">${p.avg_unit_price}</td>
                          <td className="p-3 text-right font-mono text-slate-300">${p.predicted_spend?.toLocaleString()}</td>
                          <td className="p-3 text-center"><TrendBadge trend={p.trend} /></td>
                          <td className="p-3 text-center"><ConfidenceBadge confidence={p.confidence} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Anomalies */}
              {activeTab === 'anomalies' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <StatCard label="Total Scanned"   value={displayAnomalies?.total_scanned || 0} />
                    <StatCard label="Anomalies Found" value={displayAnomalies?.total_anomalies || 0} alert={(displayAnomalies?.total_anomalies || 0) > 0} />
                    <StatCard label="Anomaly Rate"    value={displayAnomalies?.anomaly_rate || '0%'} />
                  </div>
                  <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                          {selectedDept === 'All' && <th className="text-left p-3">Department</th>}
                          <th className="text-left p-3">Item</th>
                          <th className="text-right p-3">Qty</th>
                          <th className="text-right p-3">Price</th>
                          <th className="text-left p-3">Reason</th>
                          <th className="text-center p-3">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(displayAnomalies?.anomalies || []).length === 0 ? (
                          <tr><td colSpan={6} className="p-4 text-center text-green-400">✓ No anomalies found</td></tr>
                        ) : (displayAnomalies?.anomalies || []).map((a, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            {selectedDept === 'All' && <td className="p-3 text-slate-400">{a.department}</td>}
                            <td className="p-3 text-slate-100 font-medium">{a.item_name}</td>
                            <td className="p-3 text-right font-mono text-slate-300">{a.quantity}</td>
                            <td className="p-3 text-right font-mono text-slate-300">${a.unit_price}</td>
                            <td className="p-3 text-slate-400 text-xs max-w-xs">{a.reason}</td>
                            <td className="p-3 text-center"><SeverityBadge severity={a.severity} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reorder Alerts */}
              {activeTab === 'reorder' && (
                <div className="space-y-3">
                  {displayAlerts.length === 0 ? (
                    <div className="card text-center">
                      <p className="text-green-400 font-medium">✓ No reorder alerts</p>
                      <p className="text-slate-500 text-sm mt-1">All items within reorder schedule</p>
                    </div>
                  ) : displayAlerts.map((a, i) => (
                    <div key={i} className={`card flex items-center gap-4 ${a.urgency === 'OVERDUE' ? 'border-red-800/50' : 'border-amber-800/30'}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${a.urgency === 'OVERDUE' ? 'bg-red-400' : 'bg-amber-400'}`} />
                      <div className="flex-1">
                        <p className="text-slate-100 font-medium">{a.item_name}</p>
                        <p className="text-xs text-slate-500">{a.department} · {a.category}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono text-sm font-medium ${a.urgency === 'OVERDUE' ? 'text-red-400' : 'text-amber-400'}`}>
                          {a.urgency === 'OVERDUE' ? 'OVERDUE' : `Due in ${a.days_until_due}d`}
                        </p>
                        <p className="text-xs text-slate-500">avg gap: {a.avg_reorder_gap_days}d</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Items */}
              {activeTab === 'top' && (
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                        <th className="text-left p-3">#</th>
                        <th className="text-left p-3">Item</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Requests</th>
                        <th className="text-right p-3">Total Qty</th>
                        <th className="text-right p-3">Depts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((item, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono text-amber-400">{i + 1}</td>
                          <td className="p-3 text-slate-100 font-medium">{item.item_name}</td>
                          <td className="p-3 text-slate-400">{item.category}</td>
                          <td className="p-3 text-right font-mono text-slate-300">{item.request_count}</td>
                          <td className="p-3 text-right font-mono text-slate-300">{item.total_quantity_requested}</td>
                          <td className="p-3 text-right font-mono text-slate-300">{item.departments_requesting}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
