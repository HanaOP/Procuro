import api from './axiosInstance'

export const addBudget       = (data) => api.post('/finance/budget', data)
export const getPendingRequests = ()  => api.get('/finance/requests/pending')
export const approveRequest  = (id)   => api.post(`/finance/requests/${id}/approve`)
export const rejectRequest   = (id)   => api.post(`/finance/requests/${id}/reject`)
export const getInvoices     = ()     => api.get('/finance/invoices')
export const updateInvoiceStatus = (id, status) => api.post(`/finance/invoices/${id}/status`, { status })
