import api from './axiosInstance'

export const getPendingRequests = ()        => api.get('/manager/requests/pending')
export const getHighPriority    = ()        => api.get('/manager/requests/high-priority')
export const getApprovedList    = ()        => api.get('/manager/requests/approved')
export const getRejectedList    = ()        => api.get('/manager/requests/rejected')
export const getExceptions      = ()        => api.get('/manager/exceptions')
export const approveRequest     = (id)      => api.put(`/manager/requests/${id}/approve`)
export const rejectRequest      = (id, data) => api.post(`/manager/requests/${id}/reject`, data)
export const clarifyRequest     = (id, data) => api.post(`/manager/requests/${id}/clarify`, data)
