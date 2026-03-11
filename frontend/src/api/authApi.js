import api from './axiosInstance'

export const register = (data) => api.post('/auth/register', data)
export const login    = (data) => api.post('/auth/login', data)
export const verifyOtp = (data) => api.post('/auth/verify-otp', data)
