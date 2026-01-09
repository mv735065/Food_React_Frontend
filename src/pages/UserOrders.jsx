import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import OrderCard from '../components/OrderCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCachedApi } from '../hooks/useCachedApi';
import { useApiCache } from '../contexts/ApiCacheContext';

const UserOrders = () => {
  const { user } = useAuth();
  const cache = useApiCache();
  const [orders, setOrders] = useState([]);
  const fetchOrdersRef = useRef(null);

  // Use cached API call
  const { data: ordersData, loading, error: apiError, refetch } = useCachedApi(
    () => orderAPI.getByUser(),
    'orders/user',
    {},
    [user]
  );

  // Extract orders from response
  useEffect(() => {
    if (ordersData) {
      const ordersList = Array.isArray(ordersData?.orders) 
        ? ordersData.orders 
        : Array.isArray(ordersData) 
          ? ordersData 
          : [];
      setOrders(ordersList);
    }
  }, [ordersData]);

  const error = apiError ? 'Failed to load orders. Please try again.' : '';

  const fetchOrders = useCallback(async () => {
    if (!user) {
      return;
    }
    refetch();
  }, [user, refetch]);

  // Update ref whenever fetchOrders changes
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }

    // Listen for order updates via socket
    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = (data) => {
        console.log('Order update received in UserOrders:', data);
        const order = data.order || data;
        const orderId = order.id || order._id || data.orderId;
        const status = order.status || data.status;
        const riderId = order.riderId || data.riderId;
        const rider = order.rider || data.rider;

        // Optimistically update the order in the list
        if (orderId) {
          setOrders(prevOrders => 
            prevOrders.map(o => {
              const oId = o.id || o._id;
              if (oId === orderId) {
                return {
                  ...o,
                  status: status || o.status,
                  riderId: riderId !== undefined ? riderId : o.riderId,
                  rider: rider || o.rider
                };
              }
              return o;
            })
          );
        } else {
          // If no order ID, invalidate cache and refresh all orders
          cache.invalidate('orders/user');
          if (fetchOrdersRef.current) {
            fetchOrdersRef.current();
          }
        }
      };

      const handleRiderAssigned = (data) => {
        console.log('Rider assigned event received:', data);
        // Invalidate cache when rider is assigned
        cache.invalidate('orders/user');
        if (fetchOrdersRef.current) {
          fetchOrdersRef.current();
        }
      };

      socket.on('order_update', handleOrderUpdate);
      socket.on('order_assigned', handleRiderAssigned);
      socket.on('rider_update', handleRiderAssigned);
      socket.on('status_update', handleOrderUpdate);

      return () => {
        socket.off('order_update', handleOrderUpdate);
        socket.off('order_assigned', handleRiderAssigned);
        socket.off('rider_update', handleRiderAssigned);
        socket.off('status_update', handleOrderUpdate);
      };
    }
  }, [user, fetchOrders]);

  // Group orders by status
  const groupedOrders = {
    active: orders.filter((o) => {
      const status = (o.status || '').toUpperCase();
      return !['DELIVERED', 'CANCELLED', 'CANCELED'].includes(status);
    }),
    completed: orders.filter((o) => {
      const status = (o.status || '').toUpperCase();
      return ['DELIVERED', 'CANCELLED', 'CANCELED'].includes(status);
    }),
  };

  // Sort orders by date (newest first)
  const sortByDate = (ordersList) => {
    return [...ordersList].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white py-12 mb-8 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">📦 My Orders</h1>
              <p className="text-xl text-primary-100">
                Track all your food orders in one place
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-sm text-primary-100">Total Orders</div>
                <div className="text-2xl font-bold">{orders.length}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-sm text-primary-100">Active</div>
                <div className="text-2xl font-bold">{groupedOrders.active.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-md">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Orders Yet</h2>
            <p className="text-gray-500 text-lg mb-6">Start ordering from your favorite restaurants!</p>
            <Link 
              to="/restaurants" 
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Orders Section */}
            {groupedOrders.active.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-8 bg-primary-600 rounded-full mr-3"></div>
                  <h2 className="text-2xl font-bold text-gray-800">Active Orders</h2>
                  <span className="ml-3 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                    {groupedOrders.active.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortByDate(groupedOrders.active).map((order) => {
                    const orderId = order.id || order._id;
                    return <OrderCard key={orderId} order={order} />;
                  })}
                </div>
              </div>
            )}

            {/* Completed Orders Section */}
            {groupedOrders.completed.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-8 bg-gray-400 rounded-full mr-3"></div>
                  <h2 className="text-2xl font-bold text-gray-800">Order History</h2>
                  <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                    {groupedOrders.completed.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortByDate(groupedOrders.completed).map((order) => {
                    const orderId = order.id || order._id;
                    return <OrderCard key={orderId} order={order} />;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserOrders;
