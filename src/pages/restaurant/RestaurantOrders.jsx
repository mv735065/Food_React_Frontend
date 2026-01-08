import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { restaurantAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const RestaurantOrders = () => {
  const { id: restaurantId } = useParams();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (restaurantId) {
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
  }, [restaurantId]);

  const fetchOrders = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const response = await restaurantAPI.getOrders(restaurantId);
      
      console.log('Restaurant orders API response:', response.data);
      
      // Handle nested response structure: { status: "success", data: { orders: [...] } }
      const responseData = response.data?.data || response.data;
      const orders = Array.isArray(responseData?.orders) 
        ? responseData.orders 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      console.log('Parsed orders:', orders);
      setOrders(orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load orders';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    // Optimistic update - update state immediately
    setOrders(prevOrders => 
      prevOrders.map(order => {
        const oId = order.id || order._id;
        if (oId === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      })
    );

    try {
      await orderAPI.updateStatus(orderId, newStatus);
      setToast({ message: 'Order status updated successfully', type: 'success' });
      
      // Refresh from backend to ensure consistency
      fetchOrders();
    } catch (error) {
      // Revert optimistic update on error
      fetchOrders();
      const errorMessage = error.response?.data?.message || 'Failed to update order status';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const getStatusOptions = (currentStatus) => {
    // Normalize status to uppercase to match backend enum
    const normalizedStatus = (currentStatus || '').toUpperCase();
    
    // Backend status enum: PENDING, ACCEPTED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
    const statusFlow = {
      'PENDING': ['ACCEPTED', 'CANCELLED'],
      'ACCEPTED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY_FOR_PICKUP', 'CANCELLED'],
      'READY_FOR_PICKUP': ['CANCELLED'], // Restaurant owner can only cancel at this point
      'OUT_FOR_DELIVERY': [], // Rider handles this
      'DELIVERED': [],
      'CANCELLED': [],
      // Legacy lowercase support (for backward compatibility)
      'pending': ['ACCEPTED', 'CANCELLED'],
      'accepted': ['PREPARING', 'CANCELLED'],
      'preparing': ['READY_FOR_PICKUP', 'CANCELLED'],
      'ready_for_pickup': ['CANCELLED'],
      'out_for_delivery': [],
      'delivered': [],
      'cancelled': [],
    };
    return statusFlow[normalizedStatus] || [];
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
            const orderId = order.id || order._id;
            const statusOptions = getStatusOptions(order.status);
            const status = (order.status || '').toUpperCase();
            const totalAmount = typeof order.totalAmount === 'string' 
              ? parseFloat(order.totalAmount) 
              : (order.totalAmount || 0);
            
            // Get status color based on backend enum values
            const getStatusColor = (status) => {
              const normalizedStatus = (status || '').toUpperCase();
              if (normalizedStatus === 'DELIVERED') return 'bg-green-100 text-green-800';
              if (normalizedStatus === 'CANCELLED') return 'bg-red-100 text-red-800';
              if (normalizedStatus === 'PENDING') return 'bg-yellow-100 text-yellow-800';
              if (normalizedStatus === 'ACCEPTED') return 'bg-blue-100 text-blue-800';
              if (normalizedStatus === 'PREPARING') return 'bg-orange-100 text-orange-800';
              if (normalizedStatus === 'READY_FOR_PICKUP') return 'bg-purple-100 text-purple-800';
              if (normalizedStatus === 'OUT_FOR_DELIVERY') return 'bg-indigo-100 text-indigo-800';
              return 'bg-gray-100 text-gray-800';
            };
            
            return (
              <div key={orderId} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Order #{orderId ? orderId.slice(-6) : 'N/A'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {(order.status || '').replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Items:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {order.items?.map((item, index) => {
                      const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                      return (
                        <li key={index}>
                          {item.name || `Item ${index + 1}`} x {item.quantity} - ${(itemPrice * item.quantity).toFixed(2)}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Total:</span> ${totalAmount.toFixed(2)}
                    </p>
                    {order.deliveryAddress && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Delivery:</span> {order.deliveryAddress}
                      </p>
                    )}
                    {order.customer && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Customer:</span> {order.customer.name || order.customer.email}
                      </p>
                    )}
                  </div>
                </div>

                {statusOptions.length > 0 && (
                  <div className="flex space-x-2 pt-4 border-t">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(orderId, status)}
                        className={`btn-secondary ${
                          status === 'CANCELLED' ? 'bg-red-500 hover:bg-red-600 text-white' : ''
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
