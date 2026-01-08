import { useState, useEffect, useRef, useCallback } from 'react';
import { orderAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const AllRestaurantOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const fetchOrdersRef = useRef(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all orders for restaurant owner (backend filters by owned restaurants)
      const response = await orderAPI.getAll();
      
      console.log('All restaurant orders API response:', response.data);
      
      // Handle nested response structure: { status: "success", data: { orders: [...] } }
      const responseData = response.data?.data || response.data;
      const ordersList = Array.isArray(responseData?.orders) 
        ? responseData.orders 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      console.log('Parsed all restaurant orders:', ordersList);
      setOrders(ordersList);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load orders';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Update ref whenever fetchOrders changes
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();

    // Listen for order updates via socket
    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = (data) => {
        console.log('Order update received:', data);
        if (fetchOrdersRef.current) {
          fetchOrdersRef.current();
        }
      };

      socket.on('order_update', handleOrderUpdate);
      socket.on('new_order', handleOrderUpdate);
      socket.on('order_assigned', handleOrderUpdate);

      return () => {
        socket.off('order_update', handleOrderUpdate);
        socket.off('new_order', handleOrderUpdate);
        socket.off('order_assigned', handleOrderUpdate);
      };
    }
  }, [fetchOrders]);

  // Group orders by date
  const groupOrdersByDate = (ordersList) => {
    const grouped = {};
    
    ordersList.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(order);
    });

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(b) - new Date(a);
    });

    // Sort orders within each date by time (newest first)
    sortedDates.forEach(date => {
      grouped[date].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    });

    return { grouped, sortedDates };
  };

  const formatPrice = (price) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${numPrice.toFixed(2)}`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
      const response = await orderAPI.updateStatus(orderId, newStatus);
      setToast({ message: 'Order status updated successfully', type: 'success' });
      
      // Refresh from backend to ensure consistency
      if (fetchOrdersRef.current) {
        await fetchOrdersRef.current();
      }
    } catch (error) {
      // Revert optimistic update on error
      if (fetchOrdersRef.current) {
        await fetchOrdersRef.current();
      }
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  const { grouped, sortedDates } = groupOrdersByDate(orders);

  return (
    <div className="container mx-auto px-4 py-8">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">All Orders</h1>
          <p className="text-gray-600">Orders from all your restaurants</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-4">
              <div className="sticky top-16 bg-gray-50 py-3 px-4 rounded-lg border-b-2 border-primary-500 z-10">
                <h2 className="text-xl font-semibold text-gray-900">{date}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {grouped[date].length} {grouped[date].length === 1 ? 'order' : 'orders'}
                </p>
              </div>

              <div className="space-y-4">
                {grouped[date].map((order) => {
                  const orderId = order.id || order._id;
                  const totalAmount = typeof order.totalAmount === 'string' 
                    ? parseFloat(order.totalAmount) 
                    : (order.totalAmount || 0);
                  const restaurant = order.restaurant || {};
                  const customer = order.customer || {};
                  const statusOptions = getStatusOptions(order.status);

                  return (
                    <div key={orderId} className="card hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-semibold">
                              Order #{orderId ? orderId.slice(-6).toUpperCase() : 'N/A'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {(order.status || '').replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">{formatPrice(totalAmount)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-gray-500">Restaurant:</span>
                          <p className="font-medium text-gray-900">{restaurant.name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Customer:</span>
                          <p className="font-medium text-gray-900">{customer.name || customer.email || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Items:</p>
                        <div className="text-sm text-gray-700">
                          {order.items?.slice(0, 2).map((item, index) => (
                            <span key={index}>
                              {item.name || `Item ${index + 1}`} x{item.quantity}
                              {index < Math.min(order.items.length - 1, 1) && ', '}
                            </span>
                          ))}
                          {order.items && order.items.length > 2 && (
                            <span className="text-gray-500"> +{order.items.length - 2} more</span>
                          )}
                        </div>
                      </div>

                      {order.deliveryAddress && (
                        <div className="mb-3 text-sm">
                          <span className="text-gray-500">Delivery: </span>
                          <span className="text-gray-700">{order.deliveryAddress}</span>
                        </div>
                      )}

                      {order.rider && (
                        <div className="mb-3 text-sm">
                          <span className="text-gray-500">Rider: </span>
                          <span className="text-blue-600 font-medium">{order.rider.name || order.rider.email || 'N/A'}</span>
                        </div>
                      )}

                      {statusOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t">
                          {statusOptions.map((status) => (
                            <button
                              key={status}
                              onClick={() => updateOrderStatus(orderId, status)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                status === 'CANCELLED' 
                                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                                  : 'bg-primary-600 hover:bg-primary-700 text-white'
                              }`}
                            >
                              Mark as {status.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllRestaurantOrders;
