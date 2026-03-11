import api from './axiosInstance'

export const viewOpenRFQs    = ()     => api.get('/supplier/rfqs')
export const submitQuotation = (data) => api.post('/supplier/quotation', data)
export const myQuotations    = ()     => api.get('/supplier/my-quotations')
