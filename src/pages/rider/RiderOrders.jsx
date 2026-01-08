import { useState, useEffect } from 'react';
import { riderAPI, orderAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';

const RiderOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [newOrderModal, setNewOrderModal] = useState(null); // { order: {...}, isOpen: true }
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();

    // Listen for order assignments and new orders ready for pickup via socket
    const socket = getSocket();
    if (socket) {
      // Handle when order is assigned to this rider
      const handleNewAssignment = (data) => {
        const orderId = data.orderId || data.id || data.order?.id || data.order?._id;
        setToast({ message: `New order assigned: #${orderId ? orderId.slice(-6) : 'N/A'}`, type: 'info' });
        fetchOrders();
      };

      // Handle when a new order is ready for pickup (available for riders)
      const handleNewOrderReady = (data) => {
        console.log('New order ready for pickup:', data);
        const order = data.order || data;
        const orderId = order.id || order._id;
        
        // Check if this order is already assigned or in our list
        const isAlreadyAssigned = orders.some(o => (o.id || o._id) === orderId);
        
        if (!isAlreadyAssigned && order.status === 'READY_FOR_PICKUP' && !order.riderId) {
          // Show popup modal for accepting the order
          setNewOrderModal({ order, isOpen: true });
        }
        
        // Refresh orders list
        fetchOrders();
      };

      // Handle order status updates - check if order becomes ready for pickup
      const handleOrderUpdate = (data) => {
        console.log('Order update received:', data);
        const order = data.order || data;
        const status = (order.status || data.status || '').toUpperCase();
        const orderId = order.id || order._id || data.orderId;
        
        // If order status is READY_FOR_PICKUP and not assigned, show modal
        if (status === 'READY_FOR_PICKUP' && !order.riderId && !data.riderId) {
          const isAlreadyAssigned = orders.some(o => (o.id || o._id) === orderId);
          if (!isAlreadyAssigned) {
            setNewOrderModal({ order, isOpen: true });
          }
        }
        
        fetchOrders();
      };

      socket.on('order_assigned', handleNewAssignment);
      socket.on('order_update', handleOrderUpdate);
      socket.on('new_order_ready', handleNewOrderReady); // Backend emits this when order is ready
      socket.on('order_ready_for_pickup', handleNewOrderReady); // Alternative event name

      return () => {
        socket.off('order_assigned', handleNewAssignment);
        socket.off('order_update', handleOrderUpdate);
        socket.off('new_order_ready', handleNewOrderReady);
        socket.off('order_ready_for_pickup', handleNewOrderReady);
      };
    }
  }, [orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await riderAPI.getAssignedOrders();
      
      console.log('Rider orders API response:', response.data);
      
      // Handle nested response structure: { status: "success", data: { orders: [...] } }
      const responseData = response.data?.data || response.data;
      const ordersList = Array.isArray(responseData?.orders) 
        ? responseData.orders 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      console.log('Parsed rider orders:', ordersList);
      setOrders(ordersList);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load orders';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Accept order by assigning current rider to it
  const acceptOrder = async (orderId) => {
    if (!user?.id) {
      setToast({ message: 'User not authenticated', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      // Use assignRider API to accept the order
      await orderAPI.assignRider(orderId, user.id);
      setToast({ 
        message: 'Order accepted successfully! User will be notified.', 
        type: 'success' 
      });
      setNewOrderModal(null); // Close modal
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error('Failed to accept order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to accept order';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await riderAPI.updateOrderStatus(orderId, newStatus);
      setToast({ message: 'Order status updated successfully', type: 'success' });
      fetchOrders();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update order status';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  // Backend status enum: PENDING, ACCEPTED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
  // Available orders are those ready for pickup (READY_FOR_PICKUP) that haven't been assigned to a rider yet
  const availableOrders = orders.filter((o) => {
    const status = (o.status || '').toUpperCase();
    return status === 'READY_FOR_PICKUP' && !o.riderId;
  });
  
  // My orders are those assigned to this rider (have riderId matching current user)
  const myOrders = orders.filter((o) => {
    const status = (o.status || '').toUpperCase();
    return o.riderId && 
           status !== 'DELIVERED' && 
           status !== 'CANCELLED' &&
           (status === 'OUT_FOR_DELIVERY' || status === 'READY_FOR_PICKUP');
  });

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

      {/* New Order Acceptance Modal */}
      {newOrderModal?.isOpen && newOrderModal?.order && (
        <Modal
          isOpen={true}
          onClose={() => setNewOrderModal(null)}
          title="New Order Available!"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-semibold">
                🎉 A new order is ready for pickup!
              </p>
            </div>

            {(() => {
              const order = newOrderModal.order;
              const orderId = order.id || order._id;
              const totalAmount = typeof order.totalAmount === 'string' 
                ? parseFloat(order.totalAmount) 
                : (order.totalAmount || 0);
              
              return (
                <>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Order #{orderId ? orderId.slice(-6) : 'N/A'}
                      </h3>
                    </div>

                    {order.restaurant && (
                      <div>
                        <p className="text-sm text-gray-600">Restaurant</p>
                        <p className="font-medium">{order.restaurant.name || 'N/A'}</p>
                        {order.restaurant.address && (
                          <p className="text-sm text-gray-500">{order.restaurant.address}</p>
                        )}
                      </div>
                    )}

                    {order.deliveryAddress && (
                      <div>
                        <p className="text-sm text-gray-600">Delivery Address</p>
                        <p className="font-medium">{order.deliveryAddress}</p>
                      </div>
                    )}

                    {order.customer && (
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-medium">
                          {order.customer.name || order.customer.email || 'N/A'}
                        </p>
                        {order.phoneNumber && (
                          <p className="text-sm text-gray-500">Phone: {order.phoneNumber}</p>
                        )}
                      </div>
                    )}

                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Amount</span>
                        <span className="text-xl font-bold text-primary-600">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Delivery Fee: $5.00</p>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-sm text-gray-600 mb-2">Items ({order.items.length})</p>
                        <div className="space-y-1">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <p key={idx} className="text-sm">
                              {item.name || `Item ${idx + 1}`} x {item.quantity}
                            </p>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-sm text-gray-500">
                              + {order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                      onClick={() => setNewOrderModal(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => acceptOrder(orderId)}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                      disabled={loading}
                    >
                      {loading ? 'Accepting...' : 'Accept Order'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      <h1 className="text-3xl font-bold mb-8">Assigned Orders</h1>

      {/* Available Orders */}
      {availableOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Available Orders</h2>
          <div className="space-y-4">
            {availableOrders.map((order) => {
              const orderId = order.id || order._id;
              const totalAmount = typeof order.totalAmount === 'string' 
                ? parseFloat(order.totalAmount) 
                : (order.totalAmount || 0);
              
              return (
                <div key={orderId} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Order #{orderId ? orderId.slice(-6) : 'N/A'}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Restaurant: {order.restaurant?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Delivery to: {order.deliveryAddress || 'N/A'}
                      </p>
                      {order.customer && (
                        <p className="text-sm text-gray-500">
                          Customer: {order.customer.name || order.customer.email || 'N/A'}
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      READY FOR PICKUP
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="font-medium">Total: ${totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Delivery Fee: $5.00</p>
                  </div>
                  <button
                    onClick={() => acceptOrder(orderId)}
                    className="btn-primary w-full"
                    disabled={loading}
                  >
                    {loading ? 'Accepting...' : 'Accept Order'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {availableOrders.length === 0 && myOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No orders available.</p>
        </div>
      )}

      {/* My Orders */}
      {myOrders.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Orders</h2>
          <div className="space-y-4">
            {myOrders.map((order) => {
              const orderId = order.id || order._id;
              const status = (order.status || '').toUpperCase();
              const totalAmount = typeof order.totalAmount === 'string' 
                ? parseFloat(order.totalAmount) 
                : (order.totalAmount || 0);
              
              const getStatusColor = (status) => {
                const normalizedStatus = (status || '').toUpperCase();
                if (normalizedStatus === 'DELIVERED') return 'bg-green-100 text-green-800';
                if (normalizedStatus === 'OUT_FOR_DELIVERY') return 'bg-blue-100 text-blue-800';
                if (normalizedStatus === 'READY_FOR_PICKUP') return 'bg-purple-100 text-purple-800';
                return 'bg-yellow-100 text-yellow-800';
              };
              
              return (
                <div key={orderId} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Order #{orderId ? orderId.slice(-6) : 'N/A'}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Restaurant: {order.restaurant?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Delivery to: {order.deliveryAddress || 'N/A'}
                      </p>
                      {order.customer && (
                        <p className="text-sm text-gray-500 mt-1">
                          Customer: {order.customer.name || order.customer.email || 'N/A'}
                        </p>
                      )}
                      {order.phoneNumber && (
                        <p className="text-sm text-gray-500 mt-1">
                          Phone: {order.phoneNumber}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="font-medium">Total: ${totalAmount.toFixed(2)}</p>
                  </div>
                  {status === 'READY_FOR_PICKUP' && (
                    <button
                      onClick={() => updateOrderStatus(orderId, 'OUT_FOR_DELIVERY')}
                      className="btn-primary w-full mb-2"
                    >
                      Mark as Out for Delivery
                    </button>
                  )}
                  {status === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => updateOrderStatus(orderId, 'DELIVERED')}
                      className="btn-primary w-full"
                    >
                      Mark as Delivered
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderOrders;
