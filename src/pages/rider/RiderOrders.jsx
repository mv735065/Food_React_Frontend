import { useState, useEffect, useRef, useCallback } from 'react';
import { riderAPI, orderAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import BackButton from '../../components/BackButton';

const RiderOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [newOrderModal, setNewOrderModal] = useState(null); // { order: {...}, isOpen: true }
  const { user } = useAuth();
  const ordersRef = useRef([]); // Ref to track current orders without causing re-renders
  const modalShownRef = useRef(new Set()); // Track which order modals have been shown

  // Update ref whenever orders change
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Function to check for orders ready for pickup and show modal
  const checkAndShowReadyOrders = useCallback(async (ordersList) => {
    for (const order of ordersList) {
      const orderId = order.id || order._id;
      const status = (order.status || '').toUpperCase();
      const hasModalBeenShown = modalShownRef.current.has(orderId);
      
      if (status === 'READY_FOR_PICKUP' && !order.riderId && !hasModalBeenShown && orderId) {
        console.log('Found order ready for pickup:', orderId);
        // Mark modal as shown for this order
        modalShownRef.current.add(orderId);
        
        // Fetch full order details to get complete restaurant information
        try {
          const fullOrderResponse = await orderAPI.getById(orderId);
          const fullResponseData = fullOrderResponse.data?.data || fullOrderResponse.data;
          const fullOrder = fullResponseData?.order || fullResponseData || order;
          
          console.log('Showing modal for ready order:', fullOrder);
          setNewOrderModal({ order: fullOrder, isOpen: true });
          setToast({ 
            message: `New order #${orderId.slice(-6)} is ready for pickup!`, 
            type: 'info' 
          });
          break; // Only show one modal at a time
        } catch (error) {
          console.error('Failed to fetch full order details:', error);
          // Fallback to using the order data from the list
          setNewOrderModal({ order, isOpen: true });
          setToast({ 
            message: `New order #${orderId.slice(-6)} is ready for pickup!`, 
            type: 'info' 
          });
          break; // Only show one modal at a time
        }
      }
    }
  }, []);

  // Store fetchOrders in a ref so socket handlers always have the latest version
  const fetchOrdersRef = useRef(null);

  // Memoize fetchOrders to avoid recreating it
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both assigned orders and orders ready for pickup
      // The backend /orders endpoint for RIDER role returns:
      // - Orders assigned to this rider (riderId = user.id)
      // - Orders with status READY_FOR_PICKUP that are not yet assigned
      const response = await orderAPI.getAll(null, 'READY_FOR_PICKUP');
      
      console.log('Rider orders API response (READY_FOR_PICKUP):', response.data);
      
      // Also fetch assigned orders to get all orders for this rider
      const assignedResponse = await riderAPI.getAssignedOrders();
      console.log('Rider assigned orders API response:', assignedResponse.data);
      
      // Handle nested response structure: { status: "success", data: { orders: [...] } }
      const responseData = response.data?.data || response.data;
      const readyOrders = Array.isArray(responseData?.orders) 
        ? responseData.orders 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      const assignedData = assignedResponse.data?.data || assignedResponse.data;
      const assignedOrders = Array.isArray(assignedData?.orders) 
        ? assignedData.orders 
        : Array.isArray(assignedData) 
          ? assignedData 
          : [];
      
      // Combine both lists, removing duplicates
      const allOrdersMap = new Map();
      
      // Add assigned orders first
      assignedOrders.forEach(order => {
        const orderId = order.id || order._id;
        if (orderId) allOrdersMap.set(orderId, order);
      });
      
      // Add ready orders (will overwrite if duplicate, but that's fine)
      readyOrders.forEach(order => {
        const orderId = order.id || order._id;
        if (orderId) allOrdersMap.set(orderId, order);
      });
      
      const ordersList = Array.from(allOrdersMap.values());
      
      console.log('Combined rider orders:', ordersList);
      setOrders(ordersList);
      
      // Check for orders that are ready for pickup and show modal if not already shown
      await checkAndShowReadyOrders(ordersList);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load orders';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [checkAndShowReadyOrders]);

  // Update ref whenever fetchOrders changes
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();

    // Listen for order assignments and new orders ready for pickup via socket
    const socket = getSocket();
    if (socket) {
      console.log('Socket connected, setting up listeners');
      
      // Handle when order is assigned to this rider
      const handleNewAssignment = (data) => {
        console.log('Order assigned event received:', data);
        const orderId = data.orderId || data.id || data.order?.id || data.order?._id;
        setToast({ message: `New order assigned: #${orderId ? orderId.slice(-6) : 'N/A'}`, type: 'info' });
        // Use ref to get latest fetchOrders
        if (fetchOrdersRef.current) {
          fetchOrdersRef.current();
        }
      };

      // Handle when a new order is ready for pickup (available for riders)
      const handleNewOrderReady = async (data) => {
        console.log('New order ready event received:', data);
        const order = data.order || data;
        const orderId = order.id || order._id;
        const status = (order.status || '').toUpperCase();
        
        console.log('Order status:', status, 'Order ID:', orderId, 'Rider ID:', order.riderId);
        
        // Check if this order is already assigned or in our list using ref
        const isAlreadyAssigned = ordersRef.current.some(o => (o.id || o._id) === orderId);
        const hasModalBeenShown = modalShownRef.current.has(orderId);
        
        if (!isAlreadyAssigned && !hasModalBeenShown && status === 'READY_FOR_PICKUP' && !order.riderId && orderId) {
          console.log('Showing modal for new ready order via socket');
          // Mark modal as shown for this order
          modalShownRef.current.add(orderId);
          
          // Fetch full order details to get complete restaurant information
          try {
            const fullOrderResponse = await orderAPI.getById(orderId);
            const responseData = fullOrderResponse.data?.data || fullOrderResponse.data;
            const fullOrder = responseData?.order || responseData || order;
            
            console.log('Full order details for modal:', fullOrder);
            setNewOrderModal({ order: fullOrder, isOpen: true });
            setToast({ 
              message: `New order #${orderId.slice(-6)} is ready for pickup!`, 
              type: 'info' 
            });
          } catch (error) {
            console.error('Failed to fetch full order details:', error);
            // Fallback to using the order data from the socket event
            setNewOrderModal({ order, isOpen: true });
            setToast({ 
              message: `New order #${orderId.slice(-6)} is ready for pickup!`, 
              type: 'info' 
            });
          }
        }
        
        // Refresh orders list using ref to get latest fetchOrders
        if (fetchOrdersRef.current) {
          fetchOrdersRef.current();
        }
      };

      // Handle order status updates - check if order becomes ready for pickup
      const handleOrderUpdate = async (data) => {
        console.log('Order update event received:', data);
        const order = data.order || data;
        const status = (order.status || data.status || '').toUpperCase();
        const orderId = order.id || order._id || data.orderId;
        
        console.log('Order update - Status:', status, 'Order ID:', orderId, 'Rider ID:', order.riderId || data.riderId);
        
        // If order status is READY_FOR_PICKUP and not assigned, show modal
        if (status === 'READY_FOR_PICKUP' && !order.riderId && !data.riderId) {
          // Check using ref to avoid dependency on orders state
          const isAlreadyAssigned = ordersRef.current.some(o => (o.id || o._id) === orderId);
          const hasModalBeenShown = modalShownRef.current.has(orderId);
          
          if (!isAlreadyAssigned && !hasModalBeenShown && orderId) {
            console.log('Showing modal for order update via socket');
            // Mark modal as shown for this order
            modalShownRef.current.add(orderId);
            
            // Fetch full order details to get complete restaurant information
            try {
              const fullOrderResponse = await orderAPI.getById(orderId);
              const responseData = fullOrderResponse.data?.data || fullOrderResponse.data;
              const fullOrder = responseData?.order || responseData || order;
              
              console.log('Full order details for modal:', fullOrder);
              setNewOrderModal({ order: fullOrder, isOpen: true });
              setToast({ 
                message: `New order #${orderId.slice(-6)} is ready for pickup!`, 
                type: 'info' 
              });
            } catch (error) {
              console.error('Failed to fetch full order details:', error);
              // Fallback to using the order data from the socket event
              setNewOrderModal({ order, isOpen: true });
              setToast({ 
                message: `New order #${orderId.slice(-6)} is ready for pickup!`, 
                type: 'info' 
              });
            }
          }
        }
        
        // Always refresh orders list when any order update occurs to keep UI in sync
        console.log('Refreshing orders list due to order update');
        if (fetchOrdersRef.current) {
          fetchOrdersRef.current();
        }
      };

      // Listen to all possible socket events
      socket.on('order_assigned', handleNewAssignment);
      socket.on('order_update', handleOrderUpdate);
      socket.on('new_order_ready', handleNewOrderReady);
      socket.on('order_ready_for_pickup', handleNewOrderReady);
      socket.on('new_order', handleNewOrderReady); // Also listen to new_order event
      socket.on('notification', (data) => {
        console.log('Notification received:', data);
        if (data.type === 'order_ready' || data.message?.includes('ready')) {
          if (fetchOrdersRef.current) {
            fetchOrdersRef.current();
          }
        }
      });

      return () => {
        socket.off('order_assigned', handleNewAssignment);
        socket.off('order_update', handleOrderUpdate);
        socket.off('new_order_ready', handleNewOrderReady);
        socket.off('order_ready_for_pickup', handleNewOrderReady);
        socket.off('new_order', handleNewOrderReady);
        socket.off('notification');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount


  // Accept order by assigning current rider to it and update status to OUT_FOR_DELIVERY
  const acceptOrder = async (orderId) => {
    if (!user?.id) {
      setToast({ message: 'User not authenticated', type: 'error' });
      return;
    }

    // Optimistic update - update state immediately
    setOrders(prevOrders => 
      prevOrders.map(order => {
        const oId = order.id || order._id;
        if (oId === orderId) {
          return { 
            ...order, 
            status: 'OUT_FOR_DELIVERY',
            riderId: user.id,
            rider: { id: user.id, name: user.name, email: user.email }
          };
        }
        return order;
      })
    );

    try {
      setLoading(true);
      
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
      setNewOrderModal(null); // Close modal
      // Remove from modal shown set since order is now accepted
      modalShownRef.current.delete(orderId);
      
      // Refresh from backend to ensure consistency
      if (fetchOrdersRef.current) {
        await fetchOrdersRef.current();
      }
    } catch (error) {
      console.error('Failed to accept order:', error);
      // Revert optimistic update on error
      if (fetchOrdersRef.current) {
        await fetchOrdersRef.current();
      }
      const errorMessage = error.response?.data?.message || 'Failed to accept order';
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
      await riderAPI.updateOrderStatus(orderId, newStatus);
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

  // Backend status enum: PENDING, ACCEPTED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
  // Available orders are those ready for pickup (READY_FOR_PICKUP) that haven't been assigned to a rider yet
  const availableOrders = orders.filter((o) => {
    const status = (o.status || '').toUpperCase();
    return status === 'READY_FOR_PICKUP' && !o.riderId;
  });
  
  // My orders are ALL orders assigned to this rider (complete history including delivered and cancelled)
  const myOrders = orders.filter((o) => {
    if (!user?.id) return false;
    const oRiderId = o.riderId || o.rider?.id;
    return oRiderId === user.id; // Show all orders assigned to this rider
  });
  
  // Separate active orders from completed orders for display
  const activeOrders = myOrders.filter((o) => {
    const status = (o.status || '').toUpperCase();
    return status !== 'DELIVERED' && status !== 'CANCELLED';
  });
  
  const completedOrders = myOrders.filter((o) => {
    const status = (o.status || '').toUpperCase();
    return status === 'DELIVERED' || status === 'CANCELLED';
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
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-2">📍 Restaurant Details</p>
                        <p className="font-bold text-lg text-gray-900">{order.restaurant.name || 'N/A'}</p>
                        {order.restaurant.address && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Address:</span> {order.restaurant.address}
                          </p>
                        )}
                        {order.restaurant.phoneNumber && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Phone:</span> {order.restaurant.phoneNumber}
                          </p>
                        )}
                        {order.restaurant.cuisineType && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Cuisine:</span> {order.restaurant.cuisineType}
                          </p>
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

      <BackButton to="/rider/dashboard" />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Assigned Orders</h1>
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
      
      {availableOrders.length === 0 && activeOrders.length === 0 && completedOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No orders available.</p>
        </div>
      )}

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Active Orders</h2>
          <div className="space-y-4">
            {activeOrders.map((order) => {
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

      {/* Completed Orders (History) */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Order History</h2>
          <div className="space-y-4">
            {completedOrders.map((order) => {
              const orderId = order.id || order._id;
              const status = (order.status || '').toUpperCase();
              const totalAmount = typeof order.totalAmount === 'string' 
                ? parseFloat(order.totalAmount) 
                : (order.totalAmount || 0);
              
              const getStatusColor = (status) => {
                const normalizedStatus = (status || '').toUpperCase();
                if (normalizedStatus === 'DELIVERED') return 'bg-green-100 text-green-800';
                if (normalizedStatus === 'CANCELLED') return 'bg-red-100 text-red-800';
                return 'bg-gray-100 text-gray-800';
              };
              
              return (
                <div key={orderId} className="card opacity-90">
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
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">Total: ${totalAmount.toFixed(2)}</p>
                  </div>
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
