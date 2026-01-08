import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getSocket } from '../services/socket';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket();
    if (!socket) return;

    // Listen for new notifications
    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    // Listen for order status updates
    const handleOrderUpdate = (data) => {
      const notification = {
        _id: Date.now().toString(),
        type: 'order_update',
        message: `Order #${data.orderId} status updated to ${data.status}`,
        orderId: data.orderId,
        status: data.status,
        createdAt: new Date(),
      };
      handleNewNotification(notification);
    };

    // Listen for new order (restaurant)
    const handleNewOrder = (data) => {
      const notification = {
        _id: Date.now().toString(),
        type: 'new_order',
        message: `New order #${data.orderId} received`,
        orderId: data.orderId,
        createdAt: new Date(),
      };
      handleNewNotification(notification);
    };

    // Listen for rider updates
    const handleRiderUpdate = (data) => {
      const notification = {
        _id: Date.now().toString(),
        type: 'rider_update',
        message: data.message || `Rider update for order #${data.orderId}`,
        orderId: data.orderId,
        createdAt: new Date(),
      };
      handleNewNotification(notification);
    };

    socket.on('notification', handleNewNotification);
    socket.on('order_update', handleOrderUpdate);
    socket.on('new_order', handleNewOrder);
    socket.on('rider_update', handleRiderUpdate);

    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('order_update', handleOrderUpdate);
      socket.off('new_order', handleNewOrder);
      socket.off('rider_update', handleRiderUpdate);
    };
  }, [isAuthenticated, token]);

  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n._id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (notificationId) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n._id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      return prev.filter((n) => n._id !== notificationId);
    });
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
