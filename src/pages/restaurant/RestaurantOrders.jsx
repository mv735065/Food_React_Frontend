import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { restaurantAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const RestaurantOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    if (user?.restaurantId) {
      setRestaurantId(user.restaurantId);
      fetchOrders();
    }

    // Listen for new orders via socket
    const socket = getSocket();
    if (socket) {
      const handleNewOrder = (data) => {
        setToast({ message: `New order #${data.orderId.slice(-6)} received!`, type: 'info' });
        fetchOrders(); // Refresh orders
      };

      socket.on('new_order', handleNewOrder);

      return () => {
        socket.off('new_order', handleNewOrder);
      };
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const response = await restaurantAPI.getOrders(restaurantId);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setToast({ message: 'Failed to load orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      setToast({ message: 'Order status updated successfully', type: 'success' });
      fetchOrders();
    } catch (error) {
      setToast({ message: 'Failed to update order status', type: 'error' });
    }
  };

  const getStatusOptions = (currentStatus) => {
    const statusFlow = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['cancelled'],
      picked_up: [],
      delivered: [],
      cancelled: [],
    };
    return statusFlow[currentStatus] || [];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <h1 className="text-3xl font-bold mb-8">Restaurant Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const statusOptions = getStatusOptions(order.status);
            return (
              <div key={order._id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Order #{order._id.slice(-6)}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Items:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {order.items?.map((item, index) => (
                      <li key={index}>
                        {item.name || `Item ${index + 1}`} x {item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Total:</span> ${order.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                    {order.deliveryAddress && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Delivery:</span> {order.deliveryAddress}
                      </p>
                    )}
                  </div>
                </div>

                {statusOptions.length > 0 && (
                  <div className="flex space-x-2 pt-4 border-t">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(order._id, status)}
                        className={`btn-secondary ${
                          status === 'cancelled' ? 'bg-red-500 hover:bg-red-600 text-white' : ''
                        }`}
                      >
                        Mark as {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RestaurantOrders;
