import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
        // Initialize socket connection
        initSocket(token);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      // Handle different response structures
      // Option 1: { success: true, data: { user, token }, message: "..." }
      // Option 2: { status: "success", data: { user, token }, message: "..." }
      // Option 3: Direct { user, token }
      let responseData = response.data;
      
      // Check if response is wrapped in a data property
      if (responseData?.data && (responseData.success || responseData.status === 'success')) {
        responseData = responseData.data;
      }
      
      const { token: newToken, user: userData } = responseData;
      
      if (!newToken || !userData) {
        console.error('Invalid response structure:', response.data);
        return {
          success: false,
          error: 'Invalid response from server. Expected user and token.',
        };
      }
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Initialize socket connection
      initSocket(newToken);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle network errors (CORS, connection refused, etc.)
      if (!error.response) {
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          return {
            success: false,
            error: 'Unable to connect to server. Please check if the backend is running on port 5000.',
          };
        }
        return {
          success: false,
          error: 'Network error. Please check your connection and ensure the backend is running.',
        };
      }
      
      // Handle backend error responses
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `Login failed (${error.response?.status || 'Unknown error'})`;
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      // Handle different response structures
      // Option 1: { success: true, data: { user, token }, message: "..." }
      // Option 2: { status: "success", data: { user, token }, message: "..." }
      // Option 3: Direct { user, token }
      let responseData = response.data;
      
      // Check if response is wrapped in a data property
      if (responseData?.data && (responseData.success || responseData.status === 'success')) {
        responseData = responseData.data;
      }
      
      const { token: newToken, user: registeredUser } = responseData;
      
      if (!newToken || !registeredUser) {
        console.error('Invalid response structure:', response.data);
        return {
          success: false,
          error: 'Invalid response from server. Expected user and token.',
        };
      }
      
      setToken(newToken);
      setUser(registeredUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(registeredUser));
      
      // Initialize socket connection
      initSocket(newToken);
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle network errors (CORS, connection refused, etc.)
      if (!error.response) {
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          return {
            success: false,
            error: 'Unable to connect to server. Please check if the backend is running on port 5000.',
          };
        }
        return {
          success: false,
          error: 'Network error. Please check your connection and ensure the backend is running.',
        };
      }
      
      // Handle backend error responses
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `Registration failed (${error.response?.status || 'Unknown error'})`;
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      disconnectSocket();
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const isAuthenticated = !!user && !!token;
  const isRestaurant = user?.role === 'restaurant';
  const isRider = user?.role === 'rider';
  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer' || !user?.role;

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isRestaurant,
    isRider,
    isAdmin,
    isCustomer,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
