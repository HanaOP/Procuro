import api from './axiosInstance'

export const getApprovedRequests  = ()              => api.get('/procurement/requests')
export const getSupplierClassifications = ()        => api.get('/procurement/supplier-classifications')
export const sendRFQ              = (data)          => api.post('/procurement/requests', data)
export const viewQuotations       = (rfq_id)        => api.get(`/procurement/quotations/${rfq_id}`)
export const selectSupplier       = (quotation_id)  => api.post(`/procurement/quotations/${quotation_id}/select`)
export const markDelivered        = (po_id)         => api.post(`/procurement/purchase-orders/${po_id}/mark-delivered`)
export const getMySupplierApprovals = ()            => api.get('/procurement/supplier-approvals')
export const giveClarification    = (id, data)      => api.post(`/procurement/supplier-approvals/${id}/clarify`, data)