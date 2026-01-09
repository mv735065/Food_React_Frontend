import { io } from 'socket.io-client';

// Socket.io Server URL from environment variable
const getSocketUrl = () => {
  if (import.meta.env.PROD) {
    // Production: must use environment variable
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (!socketUrl) {
      console.error(
        '⚠️ VITE_SOCKET_URL is not set! Please set it in your Vercel environment variables.\n' +
        'Example: https://your-backend.onrender.com\n' +
        'Current URL will be invalid - socket will not connect!'
      );
      // Don't use localhost in production - it will fail
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

const SOCKET_URL = getSocketUrl();

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  // Check if socket URL is valid
  if (!SOCKET_URL) {
    console.error(
      '❌ Cannot initialize socket: VITE_SOCKET_URL is not set!\n' +
      'Please set VITE_SOCKET_URL in your Vercel environment variables.\n' +
      'Example: https://your-backend.onrender.com'
    );
    return null;
  }

  console.log('🔌 Initializing socket connection to:', SOCKET_URL);

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
    console.error('Socket URL was:', SOCKET_URL);
    if (SOCKET_URL?.includes('localhost')) {
      console.error(
        '⚠️ You are trying to connect to localhost in production!\n' +
        'Make sure VITE_SOCKET_URL is set to your Render backend URL in Vercel environment variables.'
      );
    }
  });

  socket.on('reconnect_attempt', () => {
    console.log('🔄 Attempting to reconnect socket...');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Socket reconnection failed after all attempts');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export default { initSocket, disconnectSocket, getSocket };
