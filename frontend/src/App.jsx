import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Auth
import Login     from './pages/auth/Login'
import Register  from './pages/auth/Register'
import VerifyOtp from './pages/auth/VerifyOtp'

// Employee
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import CreateRequest     from './pages/employee/CreateRequest'
import MyRequests        from './pages/employee/MyRequests'
import Drafts            from './pages/employee/Drafts'
import EditDraft         from './pages/employee/EditDraft'
import RejectedRequests  from './pages/employee/RejectedRequests'
import RaiseException    from './pages/employee/RaiseException'
import AIChat            from './pages/employee/AIChat'   // ✅ ADDED

// Manager
import ManagerDashboard  from './pages/manager/ManagerDashboard'
import ManagerPending    from './pages/manager/PendingRequests'
import HighPriority      from './pages/manager/HighPriority'
import ManagerApproved   from './pages/manager/ApprovedRequests'
import ManagerRejected   from './pages/manager/RejectedRequests'
import ManagerClarifications from './pages/manager/Clarifications'
import ManagerExceptions from './pages/manager/Exceptions'
import AIDashboard from './pages/manager/AIDashboard'
import SupplierApprovals from './pages/manager/SupplierApprovals'

// Finance
import FinanceDashboard  from './pages/finance/FinanceDashboard'
import FinancePending    from './pages/finance/PendingRequests'
import AddBudget         from './pages/finance/AddBudget'
import ManageInvoices    from './pages/finance/ManageInvoices'

// Procurement
import ProcurementDashboard from './pages/procurement/ProcurementDashboard'
import ProcurementRequests  from './pages/procurement/ApprovedRequests'
import SendRFQ              from './pages/procurement/SendRFQ'
import ViewQuotations       from './pages/procurement/ViewQuotations'
import PurchaseOrders       from './pages/procurement/PurchaseOrders'
import SupplierApprovalStatus from './pages/procurement/SupplierApprovalStatus'
import ViewQuotationsList from './pages/procurement/ViewQuotationsList'

// Supplier
import SupplierDashboard  from './pages/supplier/SupplierDashboard'
import OpenRFQs           from './pages/supplier/OpenRFQs'
import SubmitQuotation    from './pages/supplier/SubmitQuotation'
import MyQuotations       from './pages/supplier/MyQuotations'
import MySelectionStatus  from './pages/supplier/MySelectionStatus'
import MyOrders           from './pages/supplier/MyOrders'
import UploadInvoice      from './pages/supplier/UploadInvoice'

import ProtectedRoute from './components/ProtectedRoute'

const ROLE_HOME = {
  EMPLOYEE:    '/employee',
  MANAGER:     '/manager',
  FINANCE:     '/finance',
  PROCUREMENT: '/procurement',
  SUPPLIER:    '/supplier',
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
}

function Guard({ roles, children }) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public */}
          <Route path="/login"      element={<Login />} />
          <Route path="/register"   element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/"           element={<RootRedirect />} />

          {/* ── EMPLOYEE ── */}
          <Route path="/employee"                              element={<Guard roles={['EMPLOYEE']}><EmployeeDashboard /></Guard>} />
          <Route path="/employee/new"                          element={<Guard roles={['EMPLOYEE']}><CreateRequest /></Guard>} />
          <Route path="/employee/requests"                     element={<Guard roles={['EMPLOYEE']}><MyRequests /></Guard>} />
          <Route path="/employee/drafts"                       element={<Guard roles={['EMPLOYEE']}><Drafts /></Guard>} />
          <Route path="/employee/drafts/:id/edit"              element={<Guard roles={['EMPLOYEE']}><EditDraft /></Guard>} />
          <Route path="/employee/rejected"                     element={<Guard roles={['EMPLOYEE']}><RejectedRequests /></Guard>} />
          <Route path="/employee/requests/:id/exception"       element={<Guard roles={['EMPLOYEE']}><RaiseException /></Guard>} />

          {/* ✅ AI CHAT ROUTE (FIX) */}
          <Route
            path="/ai-chat"
            element={
              <Guard roles={['EMPLOYEE']}>
                <AIChat />
              </Guard>
            }
          />

          {/* ── MANAGER ── */}
          <Route path="/manager"                               element={<Guard roles={['MANAGER']}><ManagerDashboard /></Guard>} />
          <Route path="/manager/pending"                       element={<Guard roles={['MANAGER']}><ManagerPending /></Guard>} />
          <Route path="/manager/high-priority"                 element={<Guard roles={['MANAGER']}><HighPriority /></Guard>} />
          <Route path="/manager/approved"                      element={<Guard roles={['MANAGER']}><ManagerApproved /></Guard>} />
          <Route path="/manager/rejected"                      element={<Guard roles={['MANAGER']}><ManagerRejected /></Guard>} />
          <Route path="/manager/clarifications"                element={<Guard roles={['MANAGER']}><ManagerClarifications /></Guard>} />
          <Route path="/manager/exceptions"                    element={<Guard roles={['MANAGER']}><ManagerExceptions /></Guard>} />
          <Route path="/manager/ai-dashboard" element={<Guard roles={['MANAGER']}><AIDashboard /></Guard>} /> 
          <Route path="/manager/supplier-approvals" element={<Guard roles={['MANAGER']}><SupplierApprovals /></Guard>} />

          {/* ── FINANCE ── */}
          <Route path="/finance"                               element={<Guard roles={['FINANCE']}><FinanceDashboard /></Guard>} />
          <Route path="/finance/pending"                       element={<Guard roles={['FINANCE']}><FinancePending /></Guard>} />
          <Route path="/finance/budget"                        element={<Guard roles={['FINANCE']}><AddBudget /></Guard>} />
          <Route path="/finance/invoices"                      element={<Guard roles={['FINANCE']}><ManageInvoices /></Guard>} />

          {/* ── PROCUREMENT ── */}
          <Route path="/procurement"                           element={<Guard roles={['PROCUREMENT']}><ProcurementDashboard /></Guard>} />
          <Route path="/procurement/requests"                  element={<Guard roles={['PROCUREMENT']}><ProcurementRequests /></Guard>} />
          <Route path="/procurement/rfq"                       element={<Guard roles={['PROCUREMENT']}><SendRFQ /></Guard>} />
          <Route path="/procurement/quotations/:rfq_id"        element={<Guard roles={['PROCUREMENT']}><ViewQuotations /></Guard>} />
          <Route path="/procurement/orders"                    element={<Guard roles={['PROCUREMENT']}><PurchaseOrders /></Guard>} />
          <Route path="/procurement/supplier-approvals" element={<Guard roles={['PROCUREMENT']}><SupplierApprovalStatus /></Guard>} />
          <Route path="/procurement/view-quotations" element={<Guard roles={['PROCUREMENT']}><ViewQuotationsList /></Guard>} />

          {/* ── SUPPLIER ── */}
          <Route path="/supplier"                              element={<Guard roles={['SUPPLIER']}><SupplierDashboard /></Guard>} />
          <Route path="/supplier/rfqs"                         element={<Guard roles={['SUPPLIER']}><OpenRFQs /></Guard>} />
          <Route path="/supplier/rfqs/:rfq_id/quote"           element={<Guard roles={['SUPPLIER']}><SubmitQuotation /></Guard>} />
          <Route path="/supplier/quote"                        element={<Guard roles={['SUPPLIER']}><SubmitQuotation /></Guard>} />
          <Route path="/supplier/quotations"                   element={<Guard roles={['SUPPLIER']}><MyQuotations /></Guard>} />
          <Route path="/supplier/selection-status"             element={<Guard roles={['SUPPLIER']}><MySelectionStatus /></Guard>} />
          <Route path="/supplier/orders"                       element={<Guard roles={['SUPPLIER']}><MyOrders /></Guard>} />
          <Route path="/supplier/orders/:po_id/upload-invoice" element={<Guard roles={['SUPPLIER']}><UploadInvoice /></Guard>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}