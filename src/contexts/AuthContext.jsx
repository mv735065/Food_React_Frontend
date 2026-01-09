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
        const parsedUser = JSON.parse(savedUser);
        // Normalize role when loading from localStorage
        // Ensure restaurants array exists
        const normalizedUser = {
          ...parsedUser,
          role: parsedUser.role?.toUpperCase() || parsedUser.role,
          restaurants: parsedUser.restaurants || []
        };
        setUser(normalizedUser);
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
      
      // Ensure role is normalized (backend returns uppercase)
      // Backend now includes restaurants array for restaurant owners
      const normalizedUser = {
        ...userData,
        role: userData.role?.toUpperCase() || userData.role,
        restaurants: userData.restaurants || [] // Restaurants array from backend
      };
      
      setToken(newToken);
      setUser(normalizedUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      // Initialize socket connection
      initSocket(newToken);
      
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        error,
        response: error.response,
        message: error.message,
        code: error.code,
      });
      
      // Handle network errors (CORS, connection refused, etc.)
      if (!error.response) {
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
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
      // Try multiple possible error message locations
      const errorData = error.response?.data;
      const status = error.response?.status;
      
      let errorMessage = null;
      
      // Try to extract error message from various possible locations
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.msg) {
          errorMessage = errorData.msg;
        }
      }
      
      // Fallback to status-based messages
      if (!errorMessage) {
        if (status === 401) {
          errorMessage = 'Invalid email or password.';
        } else if (status === 400) {
          errorMessage = 'Invalid credentials. Please check your email and password.';
        } else if (status === 404) {
          errorMessage = 'User not found. Please check your email.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = `Login failed. ${status ? `Status: ${status}` : 'Please try again.'}`;
        }
      }
      
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
      
      // Ensure role is normalized (backend returns uppercase)
      // Backend now includes restaurants array for restaurant owners
      const normalizedUser = {
        ...registeredUser,
        role: registeredUser.role?.toUpperCase() || registeredUser.role,
        restaurants: registeredUser.restaurants || [] // Restaurants array from backend
      };
      
      setToken(newToken);
      setUser(normalizedUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
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
      // Try to call backend logout endpoint if it exists
      await authAPI.logout();
    } catch (error) {
      // If backend doesn't have logout endpoint, just continue with local cleanup
      console.log('Logout endpoint not available, clearing local storage');
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      disconnectSocket();
    }
  };

  const updateUser = (userData) => {
    // Normalize user data
    const normalizedUser = {
      ...userData,
      role: userData.role?.toUpperCase() || userData.role,
      restaurants: userData.restaurants || []
    };
    setUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      
      // Handle nested response structure
      let responseData = response.data;
      if (responseData?.data && (responseData.success || responseData.status === 'success')) {
        responseData = responseData.data;
      }
      
      const userData = responseData?.user || responseData;
      if (userData) {
        const normalizedUser = {
          ...userData,
          role: userData.role?.toUpperCase() || userData.role,
          restaurants: userData.restaurants || []
        };
        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Normalize role to uppercase for comparison (backend uses uppercase: USER, RESTAURANT, RIDER, ADMIN)
  const normalizedRole = user?.role?.toUpperCase();

  const isAuthenticated = !!user && !!token;
  const isRestaurant = normalizedRole === 'RESTAURANT';
  const isRider = normalizedRole === 'RIDER';
  const isAdmin = normalizedRole === 'ADMIN';
  const isCustomer = normalizedRole === 'USER' || !normalizedRole;

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
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
