import api from './axiosInstance'

export const getMyDashboard      = ()     => api.get('/predictions/my-dashboard')
export const getMyDepartmentPred = ()     => api.get('/predictions/my-department')
export const getSpendForecast    = (dept) => api.get(`/predictions/forecast/spend/${encodeURIComponent(dept)}`)
export const getAnomalies        = (dept) => api.get(`/predictions/anomalies/${encodeURIComponent(dept)}`)
export const getDashboard        = (dept) => api.get(`/predictions/dashboard/${encodeURIComponent(dept)}`)
export const getReorderAlerts    = ()     => api.get('/predictions/reorder-alerts')
export const getTopItems         = ()     => api.get('/predictions/top-items')
