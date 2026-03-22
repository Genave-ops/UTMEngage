import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Events API
export const eventsAPI = {
  getAll: (params) => api.get('/events', { params }),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  updateStatus: (id, status) => api.put(`/events/${id}/status`, { status }),
  register: (id) => api.post(`/events/${id}/register`),
  unregister: (id) => api.delete(`/events/${id}/register`),
  getRegistrations: (id) => api.get(`/events/${id}/registrations`),
  getMyTicket: (id) => api.get(`/events/${id}/my-ticket`),
  checkIn: (id, checkInCode) => api.post(`/events/${id}/check-in`, { checkInCode }),
  getCheckInStats: (id) => api.get(`/events/${id}/check-in-stats`),
};

// Committees API
export const committeesAPI = {
  getAll: () => api.get('/committees'),
  getOne: (id) => api.get(`/committees/${id}`),
  create: (data) => api.post('/committees', data),
  update: (id, data) => api.put(`/committees/${id}`, data),
  delete: (id) => api.delete(`/committees/${id}`),
  updateStatus: (id, status) => api.put(`/committees/${id}/status`, { status }),
  approve: (id) => api.put(`/committees/${id}/status`, { status: 'active' }),
  reject: (id) => api.put(`/committees/${id}/status`, { status: 'rejected' }),
  join: (id) => api.post(`/committees/${id}/join`),
  leave: (id) => api.delete(`/committees/${id}/leave`),
  requestJoin: (id) => api.post(`/committees/${id}/request-join`),
  getJoinRequests: (id) => api.get(`/committees/${id}/join-requests`),
  approveJoinRequest: (id, requestId) => api.put(`/committees/${id}/join-requests/${requestId}/approve`),
  rejectJoinRequest: (id, requestId) => api.put(`/committees/${id}/join-requests/${requestId}/reject`),
  scheduleMeeting: (id, data) => api.post(`/committees/${id}/meetings`, data),
  deleteMeeting: (id, meetingId) => api.delete(`/committees/${id}/meetings/${meetingId}`),
  uploadDocument: (id, data) => api.post(`/committees/${id}/documents`, data),
  deleteDocument: (id, documentId) => api.delete(`/committees/${id}/documents/${documentId}`),
};

// Posts API
export const postsAPI = {
  getByCommittee: (committeeId) => api.get(`/committees/${committeeId}/posts`),
  create: (committeeId, data) => api.post(`/committees/${committeeId}/posts`, data),
  like: (id) => api.put(`/posts/${id}/like`),
  addComment: (id, text) => api.post(`/posts/${id}/comments`, { text }),
  delete: (id) => api.delete(`/posts/${id}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  ban: (id) => api.put(`/users/${id}/ban`),
  unban: (id) => api.put(`/users/${id}/unban`),
  delete: (id) => api.delete(`/users/${id}`),
};

// Moderation API
export const moderationAPI = {
  getReports: (params) => api.get('/moderation/reports', { params }),
  getReport: (id) => api.get(`/moderation/reports/${id}`),
  createReport: (data) => api.post('/moderation/reports', data),
  updateStatus: (id, status) => api.put(`/moderation/reports/${id}/status`, { status }),
  resolve: (id, resolution, resolutionNotes) => api.put(`/moderation/reports/${id}/resolve`, { resolution, resolutionNotes }),
  dismiss: (id, resolutionNotes) => api.put(`/moderation/reports/${id}/dismiss`, { resolutionNotes }),
  deleteReport: (id) => api.delete(`/moderation/reports/${id}`),
};

// Feedback API
export const feedbackAPI = {
  create: (data) => api.post('/feedback', data),
  submit: (data) => api.post('/feedback', data),
  getAll: (params) => api.get('/feedback', { params }),
  getOne: (id) => api.get(`/feedback/${id}`),
  getStats: () => api.get('/feedback/stats'),
  updateStatus: (id, status, adminNotes) => api.put(`/feedback/${id}/status`, { status, adminNotes }),
  delete: (id) => api.delete(`/feedback/${id}`),
  exportCSV: (params) => api.get('/feedback/export/csv', { params, responseType: 'blob' }),
};

// Broadcast API
export const broadcastAPI = {
  getAll: (params) => api.get('/broadcasts', { params }),
  getMy: () => api.get('/broadcasts/my'),
  getUnreadCount: () => api.get('/broadcasts/unread-count'),
  create: (data) => api.post('/broadcasts', data),
  update: (id, data) => api.put(`/broadcasts/${id}`, data),
  markAsRead: (id) => api.put(`/broadcasts/${id}/read`),
  delete: (id) => api.delete(`/broadcasts/${id}`),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getStakeholderDashboard: () => api.get('/analytics/stakeholder-dashboard'),
  getLogs: (params) => api.get('/analytics/logs', { params }),
  getLogStats: () => api.get('/analytics/logs/stats'),
};

// Google OAuth API
export const googleAPI = {
  getAuthUrl: () => api.get('/google/auth'),
  getStatus: () => api.get('/google/status'),
  disconnect: () => api.delete('/google/disconnect'),
};

export default api;
