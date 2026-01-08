import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { orderAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const AvailableOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState(null);

  // Fetch available orders (READY_FOR_PICKUP and not assigned)
  const fetchAvailableOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch orders with status READY_FOR_PICKUP
      const response = await orderAPI.getAll(null, 'READY_FOR_PICKUP');
      
      console.log('Available orders API response:', response.data);
      
      // Handle nested response structure
      const responseData = response.data?.data || response.data;
      const ordersList = Array.isArray(responseData?.orders) 
        ? responseData.orders 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      // Filter to only show orders that are not assigned to any rider
      const availableOrders = ordersList.filter(order => !order.riderId);
      
      console.log('Available orders (unassigned):', availableOrders);
      setOrders(availableOrders);
    } catch (error) {
      console.error('Failed to fetch available orders:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load available orders';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableOrders();

    // Set up polling to check for new orders every 5 seconds
    const pollInterval = setInterval(() => {
      console.log('Polling for available orders...');
      fetchAvailableOrders();
    }, 5000);

    // Listen for socket events
    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = (data) => {
        console.log('Order update received:', data);
        const order = data.order || data;
        const status = (order.status || '').toUpperCase();
        
        // If order becomes READY_FOR_PICKUP and not assigned, refresh list
        if (status === 'READY_FOR_PICKUP' && !order.riderId && !data.riderId) {
          fetchAvailableOrders();
        } else if (order.riderId || data.riderId) {
          // If order gets assigned, remove it from available list
          fetchAvailableOrders();
        }
      };

      const handleNewOrderReady = (data) => {
        console.log('New order ready event:', data);
        fetchAvailableOrders();
      };

      socket.on('order_update', handleOrderUpdate);
      socket.on('new_order_ready', handleNewOrderReady);
      socket.on('order_ready_for_pickup', handleNewOrderReady);
      socket.on('new_order', handleNewOrderReady);

      return () => {
        clearInterval(pollInterval);
        socket.off('order_update', handleOrderUpdate);
        socket.off('new_order_ready', handleNewOrderReady);
        socket.off('order_ready_for_pickup', handleNewOrderReady);
        socket.off('new_order', handleNewOrderReady);
      };
    } else {
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [fetchAvailableOrders]);

  // Accept order and update status to OUT_FOR_DELIVERY
  const acceptOrder = async (orderId) => {
    if (!user?.id) {
      setToast({ message: 'User not authenticated', type: 'error' });
      return;
    }

    try {
      setAcceptingOrderId(orderId);
      
      // Step 1: Assign rider to the order
      await orderAPI.assignRider(orderId, user.id);
      console.log('Rider assigned to order:', orderId);
      
      // Step 2: Update order status to OUT_FOR_DELIVERY
      await orderAPI.updateStatus(orderId, 'OUT_FOR_DELIVERY');
      console.log('Order status updated to OUT_FOR_DELIVERY');
      
      setToast({ 
        message: 'Order accepted successfully! Status updated to Out for Delivery.', 
        type: 'success' 
      });
      
      // Refresh the list
      fetchAvailableOrders();
    } catch (error) {
      console.error('Failed to accept order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to accept order';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const formatPrice = (price) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Orders</h1>
        <p className="text-gray-600">Orders ready for pickup - Accept to start delivery</p>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No orders available for pickup at the moment.</p>
          <p className="text-gray-400 text-sm mt-2">New orders will appear here when restaurants mark them as ready.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const orderId = order.id || order._id;
            const restaurant = order.restaurant || {};
            const customer = order.customer || {};
            const totalAmount = typeof order.totalAmount === 'string' 
              ? parseFloat(order.totalAmount) 
              : order.totalAmount || 0;

            return (
              <div key={orderId} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200">
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{orderId.slice(-6).toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    READY FOR PICKUP
                  </span>
                </div>

                {/* Restaurant Info */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="mr-2">🍽️</span>
                    {restaurant.name || 'Restaurant'}
                  </h4>
                  {restaurant.address && (
                    <p className="text-sm text-gray-600 mb-1">
                      📍 {restaurant.address}
                    </p>
                  )}
                  {restaurant.phoneNumber && (
                    <p className="text-sm text-gray-600">
                      📞 {restaurant.phoneNumber}
                    </p>
                  )}
                  {restaurant.cuisineType && (
                    <p className="text-xs text-gray-500 mt-1">
                      {restaurant.cuisineType}
                    </p>
                  )}
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Items:</h4>
                  <ul className="space-y-1">
                    {order.items && order.items.map((item, idx) => {
                      const itemPrice = typeof item.price === 'string' 
                        ? parseFloat(item.price) 
                        : item.price || 0;
                      return (
                        <li key={idx} className="text-sm text-gray-600 flex justify-between">
                          <span>{item.name} x {item.quantity}</span>
                          <span className="font-medium">{formatPrice(itemPrice * item.quantity)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Delivery Address */}
                {order.deliveryAddress && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-1 text-sm">Delivery Address:</h4>
                    <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                  </div>
                )}

                {/* Customer Info */}
                {customer.name && (
                  <div className="mb-4 text-sm">
                    <span className="text-gray-500">Customer: </span>
                    <span className="font-medium text-gray-700">{customer.name}</span>
                    {customer.email && (
                      <span className="text-gray-500 ml-2">({customer.email})</span>
                    )}
                  </div>
                )}

                {/* Total Amount */}
                <div className="mb-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-primary-600">{formatPrice(totalAmount)}</span>
                  </div>
                </div>

                {/* Accept Button */}
                <button
                  onClick={() => acceptOrder(orderId)}
                  disabled={acceptingOrderId === orderId}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    acceptingOrderId === orderId
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  {acceptingOrderId === orderId ? 'Accepting...' : 'Accept Order'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailableOrders;
