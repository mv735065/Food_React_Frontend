import { io } from 'socket.io-client';

// Socket.io Server URL from environment variable
const getSocketUrl = () => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.PROD && !socketUrl) {
    console.error(
      '⚠️ VITE_SOCKET_URL is not set! Please set it in your Vercel environment variables.\n' +
      'Example: https://your-backend.onrender.com'
    );
    // Fallback for production if not set
    return 'http://localhost:5000';
  }
  return socketUrl || 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
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
