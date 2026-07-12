const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_URL}/api${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }

  return data;
}

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    register: (data) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    me: () => request('/auth/me'),
  },

  passenger: {
    pricing: () => request('/passenger/pricing'),
    estimate: (data) => request('/passenger/estimate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    createRide: (data) => request('/passenger/rides', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getRide: (id) => request(`/passenger/rides/${id}`),
    cancelRide: (id) => request(`/passenger/rides/${id}/cancel`, {
      method: 'POST',
    }),
    rateRide: (id, rating, comment) => request(`/passenger/rides/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),
    getRides: () => request('/passenger/rides'),
  },

  driver: {
    updateLocation: (lat, lng) => request('/driver/location', {
      method: 'PUT',
      body: JSON.stringify({ lat, lng }),
    }),
    updateStatus: (status) => request('/driver/status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
    getPendingRides: () => request('/driver/rides/pending'),
    acceptRide: (id) => request(`/driver/rides/${id}/accept`, {
      method: 'POST',
    }),
    startRide: (id) => request(`/driver/rides/${id}/start`, {
      method: 'POST',
    }),
    completeRide: (id, fare) => request(`/driver/rides/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ fare_final: fare }),
    }),
    getEarnings: () => request('/driver/earnings'),
  },

  admin: {
    getRides: (status) => request(`/admin/rides${status ? `?status=${status}` : ''}`),
    getDrivers: () => request('/admin/drivers'),
    createDriver: (data) => request('/admin/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    approveDriver: (id) => request(`/admin/drivers/${id}/approve`, {
      method: 'PUT',
    }),
    rejectDriver: (id) => request(`/admin/drivers/${id}/reject`, {
      method: 'PUT',
    }),
    updatePricing: (data) => request('/admin/pricing', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getStats: () => request('/admin/stats'),
    getDailyReport: () => request('/admin/reports/daily'),
  },
};
