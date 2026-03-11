import api from './axiosInstance'

export const createRequest  = (data, draft = false) => api.post(`/employee/requests${draft ? '?draft=true' : ''}`, data)
export const getRequests    = ()       => api.get('/employee/requests')
export const getDrafts      = ()       => api.get('/employee/requests/drafts')
export const getRejected    = ()       => api.get('/employee/requests/rejected')
export const updateDraft    = (id, data) => api.put(`/employee/requests/${id}`, data)
export const raiseException = (id, data) => api.post(`/employee/requests/${id}/exception`, data)
