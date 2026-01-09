import axios from 'axios';

// API Base URL from environment variable
// In development, use relative URL to leverage Vite proxy (avoids CORS issues)
// In production, use the full URL from env variable
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    // Production: must use environment variable
    const prodUrl = import.meta.env.VITE_API_BASE_URL;
    if (!prodUrl) {
      console.error(
        '⚠️ VITE_API_BASE_URL is not set! Please set it in your Vercel environment variables.\n' +
        'Example: https://your-backend.onrender.com/api'
      );
      // Still return a fallback, but log the error
      return 'http://localhost:5000/api';
    }
    // Automatically append /api if not present
    // This allows users to set either https://backend.com or https://backend.com/api
    if (!prodUrl.endsWith('/api')) {
      // Remove trailing slash if present, then add /api
      const cleanUrl = prodUrl.endsWith('/') ? prodUrl.slice(0, -1) : prodUrl;
      return `${cleanUrl}/api`;
    }
    return prodUrl;
  }
  // Development: use proxy
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log response for debugging (remove in production)
    if (import.meta.env.DEV) {
      console.log('API Response:', response.config.method?.toUpperCase(), response.config.url, response.data);
    }
    return response;
  },
  (error) => {
    // Log error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle network errors (CORS, connection refused, etc.)
    if (!error.response) {
      const isCorsError = error.message?.includes('CORS') || 
                         error.message?.includes('Network Error') ||
                         error.code === 'ERR_NETWORK' ||
                         (error.message?.includes('Failed to fetch') && !error.response);
      
      if (isCorsError) {
        console.error(
          '🚫 CORS Error: Your backend needs to allow requests from your frontend domain.\n' +
          'Please configure CORS in your backend to include your Vercel URL.\n' +
          `Frontend URL: ${window.location.origin}\n` +
          `Backend URL: ${API_BASE_URL}\n` +
          'See README.md for backend CORS configuration instructions.'
        );
      } else {
        console.error('Network error - backend may not be running or unreachable');
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'), // Keep for future backend implementation
  getProfile: () => api.get('/auth/profile'), // Keep for backward compatibility
  getMe: () => api.get('/auth/me'), // Backend uses /auth/me
  updateProfile: (data) => api.put('/auth/profile', data), // Keep for future backend implementation
};

export const restaurantAPI = {
  // Public endpoints
  getAll: () => api.get('/restaurants'),
  getById: (id) => api.get(`/restaurants/${id}`),
  getMenu: (restaurantId) => api.get(`/restaurants/${restaurantId}/menu`), // Public menu (only available items)
  
  // Owner/Admin endpoints
  getMyRestaurants: () => api.get('/restaurants/my-restaurants'), // Get restaurants owned by logged-in user
  create: (data) => api.post('/restaurants', data), // Create restaurant (owner/admin only)
  update: (id, data) => api.put(`/restaurants/${id}`, data), // Update restaurant (owner/admin only)
  delete: (id) => api.delete(`/restaurants/${id}`), // Delete restaurant (owner/admin only)
  
  // Menu item management (owner/admin only)
  getMenuAll: (restaurantId) => api.get(`/restaurants/${restaurantId}/menu/all`), // Get all menu items including unavailable
  createMenuItem: (restaurantId, menuData) => api.post(`/restaurants/${restaurantId}/menu`, menuData),
  updateMenuItem: (restaurantId, itemId, menuData) => api.put(`/restaurants/${restaurantId}/menu/items/${itemId}`, menuData),
  deleteMenuItem: (restaurantId, itemId) => api.delete(`/restaurants/${restaurantId}/menu/items/${itemId}`),
  
  // Legacy endpoints (keep for backward compatibility)
  updateMenu: (restaurantId, menuData) => api.put(`/restaurants/${restaurantId}/menu`, menuData),
  // Get orders for a specific restaurant - uses /orders endpoint with restaurantId query param
  // Backend validates restaurant belongs to authenticated user
  getOrders: (restaurantId) => orderAPI.getAll(restaurantId),
  updateOrderStatus: (orderId, status) => api.put(`/orders/${orderId}/status`, { status }),
};

export const orderAPI = {
  create: (orderData) => api.post('/orders', orderData),
  // Get orders - backend automatically filters by authenticated user's role from JWT token
  // For USER: filters by userId
  // For RESTAURANT: filters by restaurants owned by user (optional restaurantId query param)
  // For RIDER: filters by riderId
  // For ADMIN: returns all orders
  // Optional query params: ?restaurantId=xxx&status=xxx
  getAll: (restaurantId, status) => {
    const params = new URLSearchParams();
    if (restaurantId) params.append('restaurantId', restaurantId);
    if (status) params.append('status', status);
    const queryString = params.toString();
    return api.get(`/orders${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  assignRider: (id, riderId) => api.put(`/orders/${id}/assign-rider`, { riderId }),
  getByUser: () => api.get('/orders'), // Get user orders - backend filters by authenticated user from JWT token
};

export const riderAPI = {
  getAssignedOrders: () => api.get('/rider/orders'), // Backend uses /rider/orders
  updateOrderStatus: (orderId, status) => api.put(`/rider/orders/${orderId}/status`, { status }), // Backend uses /rider/orders/:id/status
  acceptOrder: (orderId) => api.post(`/orders/${orderId}/accept`), // Keep for future backend implementation
};

export const paymentAPI = {
  payOrder: (orderId, paymentData) => api.post('/payments/pay', { orderId, ...paymentData }),
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read/all'),
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getRestaurants: () => api.get('/admin/restaurants'),
  createRestaurant: (data) => api.post('/admin/restaurants', data),
  updateRestaurant: (restaurantId, data) => api.put(`/admin/restaurants/${restaurantId}`, data),
  deleteRestaurant: (restaurantId) => api.delete(`/admin/restaurants/${restaurantId}`),
  getAllOrders: () => api.get('/admin/orders'),
};

export default api;
