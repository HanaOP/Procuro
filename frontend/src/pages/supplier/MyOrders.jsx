/**
 * MyOrders.jsx
 * Supplier page — shows all issued Purchase Orders
 * Route: /supplier/orders
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/Feedback'
import api from '../../api/axiosInstance'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/supplier/orders')
      .then(({ data }) => setOrders(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="section-title mb-1">Supplier</p>
          <h1 className="page-title">My Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            View orders issued to you and upload invoices for payment.
          </p>
        </div>

        {error && <ErrorAlert message={error} />}

        {loading ? <LoadingSpinner /> : orders.length === 0 ? (
          <EmptyState message="No purchase orders issued yet." />
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.po_id} className="card border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-amber-500 font-bold">PO #{order.po_id}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        Issued: {new Date(order.issued_date).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-slate-100 font-medium truncate">
                      {order.RFQ?.PurchaseRequest?.item_name || 'Purchase Order Items'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Qty: {order.RFQ?.PurchaseRequest?.quantity} · Department: {order.RFQ?.PurchaseRequest?.department}
                    </p>

                    <div className="mt-3 flex items-baseline gap-2">
                      <p className="text-slate-400 text-xs">Total Amount:</p>
                      <p className="text-lg font-mono text-green-400 font-bold">
                        ₹{parseFloat(order.total_amount).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className="text-xs px-2 py-1 rounded font-mono bg-green-900/40 text-green-400 border border-green-800/40">
                      {order.status}
                    </span>
                    <Link
                      to={`/supplier/orders/${order.po_id}/upload-invoice`}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      📤 Upload Invoice
                    </Link>
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
