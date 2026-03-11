import api from './axiosInstance'

export const createRequest  = (data, file, draft = false) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  if (file) formData.append('document', file);
  return api.post(`/employee/requests${draft ? '?draft=true' : ''}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}
export const getRequests    = ()       => api.get('/employee/requests')
export const getDrafts      = ()       => api.get('/employee/requests/drafts')
export const getRejected    = ()       => api.get('/employee/requests/rejected')
export const updateDraft    = (id, data) => api.put(`/employee/requests/${id}`, data)
export const raiseException = (id, data) => api.post(`/employee/requests/${id}/exception`, data)
export const replyToClarification = (id, data) => api.post(`/employee/requests/${id}/clarification-reply`, data)
