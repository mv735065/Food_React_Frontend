import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import OrderCard from '../components/OrderCard';
import LoadingSpinner from '../components/LoadingSpinner';

const UserOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchOrdersRef = useRef(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setError('User not logged in');
      return;
    }

    try {
      setLoading(true);
      // Backend automatically filters orders by authenticated user from JWT token
      const response = await orderAPI.getByUser();
      
      console.log('Orders API response:', response.data);
      
      // Handle nested response structure: { status: "success", data: { orders: [...] } }
      const responseData = response.data?.data || response.data;
      const ordersList = Array.isArray(responseData?.orders) 
        ? responseData.orders 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      console.log('Parsed orders list:', ordersList);
      setOrders(ordersList);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
          // If no order ID, refresh all orders
          if (fetchOrdersRef.current) {
            fetchOrdersRef.current();
          }
        }
      };

      const handleRiderAssigned = (data) => {
        console.log('Rider assigned event received:', data);
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">You haven't placed any orders yet.</p>
          <Link to="/restaurants" className="btn-primary">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const orderId = order.id || order._id;
            return <OrderCard key={orderId} order={order} />;
          })}
        </div>
      )}
    </div>
  );
};

export default UserOrders;
