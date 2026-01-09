import { io } from 'socket.io-client';

// Socket.io Server URL from environment variable
// Get socket URL at runtime (not at module load time) to ensure we always use the latest env var
const getSocketUrl = () => {
  // Debug: Log all environment variables related to socket
  if (import.meta.env.PROD) {
    console.log('🔍 Environment check (production):', {
      VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'NOT SET',
      PROD: import.meta.env.PROD,
      MODE: import.meta.env.MODE
    });
  }
  
  if (import.meta.env.PROD) {
    // Production: must use environment variable
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (!socketUrl) {
      console.error(
        '⚠️ VITE_SOCKET_URL is not set! Please set it in your Vercel environment variables.\n' +
        'Example: https://your-backend.onrender.com\n' +
        'Current URL will be invalid - socket will not connect!\n' +
        '⚠️ IMPORTANT: After setting the variable in Vercel, you MUST redeploy for it to take effect!'
      );
      // Don't use localhost in production - it will fail
      return null;
    }
    // Ensure we're not using localhost in production
    if (socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1')) {
      console.error(
        '❌ VITE_SOCKET_URL contains localhost in production! This will not work.\n' +
        'Please set VITE_SOCKET_URL to your Render backend URL (e.g., https://your-backend.onrender.com)\n' +
        'Current value:', socketUrl
      );
      return null;
    }
    console.log('🔌 Socket URL (production):', socketUrl);
    return socketUrl;
  }
  // Development: use localhost
  const devUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  console.log('🔌 Socket URL (development):', devUrl);
  return devUrl;
};

let socket = null;
let currentSocketUrl = null;

export const initSocket = (token) => {
  // Get socket URL at runtime (not cached)
  const socketUrl = getSocketUrl();
  
  // Check if socket URL is valid
  if (!socketUrl) {
    console.error(
      '❌ Cannot initialize socket: VITE_SOCKET_URL is not set!\n' +
      'Please set VITE_SOCKET_URL in your Vercel environment variables.\n' +
      'Example: https://your-backend.onrender.com'
    );
    return null;
  }

  // If socket exists but URL changed, disconnect and recreate
  if (socket && currentSocketUrl !== socketUrl) {
    console.log('🔄 Socket URL changed, disconnecting old socket and creating new one');
    socket.disconnect();
    socket = null;
  }

  // If socket is already connected with the correct URL, return it
  if (socket?.connected && currentSocketUrl === socketUrl) {
    return socket;
  }

  console.log('🔌 Initializing socket connection to:', socketUrl);
  currentSocketUrl = socketUrl;

  socket = io(socketUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id, 'to', socketUrl);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
    console.error('Socket URL was:', socketUrl);
    if (socketUrl?.includes('localhost') || socketUrl?.includes('127.0.0.1')) {
      console.error(
        '⚠️ You are trying to connect to localhost in production!\n' +
        'Make sure VITE_SOCKET_URL is set to your Render backend URL in Vercel environment variables.\n' +
        'Current value:', import.meta.env.VITE_SOCKET_URL || 'NOT SET'
      );
    }
  });

  socket.on('reconnect_attempt', () => {
    console.log('🔄 Attempting to reconnect socket to', socketUrl);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('✅ Socket reconnected after', attemptNumber, 'attempts to', socketUrl);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Socket reconnection failed after all attempts to', socketUrl);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentSocketUrl = null;
  }
};

export const getSocket = () => socket;

export default { initSocket, disconnectSocket, getSocket };
