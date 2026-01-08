import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { getSocket } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner';

const OrderStatus = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchOrderRef = useRef(null);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getById(id);
      
      console.log('Order API response:', response.data);
      
      // Handle nested response structure: { status: "success", data: { order: {...} } }
      const responseData = response.data?.data || response.data;
      const orderData = responseData?.order || responseData;
      
      console.log('Parsed order data:', orderData);
      setOrder(orderData);
    } catch (err) {
      setError('Failed to load order details. Please try again.');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Update ref whenever fetchOrder changes
  useEffect(() => {
    fetchOrderRef.current = fetchOrder;
  }, [fetchOrder]);

  useEffect(() => {
    fetchOrder();
    
    // Listen for real-time order updates
    const socket = getSocket();
    if (socket) {
      console.log('Setting up socket listeners for order:', id);
      
      // Helper function to normalize order IDs for comparison
      const normalizeOrderId = (orderId) => {
        if (!orderId) return null;
        const str = String(orderId).toLowerCase().trim();
        // Return both full ID and last 6 characters for flexible matching
        return {
          full: str,
          short: str.length > 6 ? str.slice(-6) : str
        };
      };

      // Enhanced order update handler with better ID matching
      const handleOrderUpdateEnhanced = (data) => {
        console.log('Order update event received:', data);
        const eventOrderId = data.orderId || data.id || data.order?.id || data.order?._id;
        const currentOrderId = normalizeOrderId(id);
        const eventOrderIdNorm = normalizeOrderId(eventOrderId);
        
        console.log('Comparing order IDs - Event:', eventOrderId, 'Current:', id);
        console.log('Normalized - Event:', eventOrderIdNorm, 'Current:', currentOrderId);
        
        const matches = 
          eventOrderIdNorm?.full === currentOrderId?.full ||
          eventOrderIdNorm?.short === currentOrderId?.short ||
          eventOrderId === id;
        
        if (matches) {
          console.log('Order update matches current order, refreshing...');
          if (fetchOrderRef.current) {
            fetchOrderRef.current();
          }
        }
      };

      const handleRiderAssigned = (data) => {
        console.log('Rider assigned event received:', data);
        const orderId = data.orderId || data.id || data.order?.id || data.order?._id;
        
        if (orderId === id) {
          console.log('Rider assigned matches current order, refreshing...');
          // Refresh order to get updated rider information
          if (fetchOrderRef.current) {
            fetchOrderRef.current();
          }
        }
      };

      const handleStatusUpdate = (data) => {
        console.log('Status update event received:', data);
        const orderId = data.orderId || data.id || data.order?.id || data.order?._id;
        
        if (orderId === id) {
          console.log('Status update matches current order, refreshing...');
          if (fetchOrderRef.current) {
            fetchOrderRef.current();
          }
        }
      };

      const handleNotification = (notification) => {
        console.log('Notification event received:', notification);
        // Check if notification is related to this order
        const notificationOrderId = notification.orderId || notification.order?.id || notification.order?._id;
        const message = (notification.message || '').toLowerCase();
        
        // Try to extract order ID from message if not directly available
        // Match patterns like "Order #abc123" or "order abc123-def456-..."
        const orderIdMatch = message.match(/order\s*#?([a-f0-9-]{6,})/i);
        const extractedOrderId = orderIdMatch ? orderIdMatch[1] : null;
        
        // Normalize IDs for comparison
        const currentOrderIdNorm = normalizeOrderId(id);
        const notificationOrderIdNorm = normalizeOrderId(notificationOrderId);
        const extractedOrderIdNorm = normalizeOrderId(extractedOrderId);
        
        // Check if this notification is for the current order
        const isRelevant = 
          notificationOrderIdNorm?.full === currentOrderIdNorm?.full ||
          notificationOrderIdNorm?.short === currentOrderIdNorm?.short ||
          notificationOrderId === id ||
          extractedOrderIdNorm?.short === currentOrderIdNorm?.short ||
          (extractedOrderId && id && id.includes(extractedOrderId)) ||
          (extractedOrderId && id && extractedOrderId.includes(id.slice(-6)));
        
        if (isRelevant) {
          console.log('Notification is relevant to current order, refreshing...');
          console.log('Notification details:', {
            notificationOrderId,
            extractedOrderId,
            currentOrderId: id,
            message
          });
          if (fetchOrderRef.current) {
            fetchOrderRef.current();
          }
        } else {
          console.log('Notification not relevant - skipping refresh');
        }
      };

      // Listen to all relevant socket events
      socket.on('order_update', handleOrderUpdateEnhanced);
      socket.on('order_assigned', handleRiderAssigned);
      socket.on('rider_update', handleRiderAssigned);
      socket.on('status_update', handleStatusUpdate);
      socket.on('new_order_ready', handleOrderUpdateEnhanced);
      socket.on('order_ready_for_pickup', handleOrderUpdateEnhanced);
      socket.on('notification', handleNotification); // Listen to notification events

      return () => {
        console.log('Cleaning up socket listeners for order:', id);
        socket.off('order_update', handleOrderUpdateEnhanced);
        socket.off('order_assigned', handleRiderAssigned);
        socket.off('rider_update', handleRiderAssigned);
        socket.off('status_update', handleStatusUpdate);
        socket.off('new_order_ready', handleOrderUpdateEnhanced);
        socket.off('order_ready_for_pickup', handleOrderUpdateEnhanced);
        socket.off('notification', handleNotification);
      };
    }
  }, [id]);

  const getStatusSteps = () => {
    // Backend status enum: PENDING, ACCEPTED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
    const statuses = [
      { key: 'pending', label: 'Order Placed' },
      { key: 'accepted', label: 'Accepted' },
      { key: 'preparing', label: 'Preparing' },
      { key: 'ready_for_pickup', label: 'Ready for Pickup' },
      { key: 'out_for_delivery', label: 'Out for Delivery' },
      { key: 'delivered', label: 'Delivered' },
    ];

    if (!order?.status) {
      return statuses.map((status) => ({
        ...status,
        completed: false,
        current: false,
      }));
    }

    // Normalize status to lowercase and handle various formats
    const rawStatus = (order.status || '').toString();
    const normalizedStatus = rawStatus.toLowerCase().replace(/-/g, '_').trim();
    
    console.log('Current order status:', rawStatus, 'Normalized:', normalizedStatus);
    
    // Find current status index - handle both old and new status formats
    const statusMapping = {
      'pending': 0,
      'accepted': 1,
      'confirmed': 1, // Legacy status
      'preparing': 2,
      'ready': 3, // Legacy status
      'ready_for_pickup': 3,
      'picked_up': 4, // Legacy status
      'out_for_delivery': 4,
      'delivered': 5,
      'cancelled': -1, // Cancelled orders don't show progress
    };
    
    const currentStatusIndex = statusMapping[normalizedStatus] ?? -1;
    console.log('Current status index:', currentStatusIndex);
    
    return statuses.map((status, index) => ({
      ...status,
      completed: index <= currentStatusIndex && currentStatusIndex >= 0,
      current: index === currentStatusIndex,
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Order not found'}
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Orders
      </Link>

      <h1 className="text-3xl font-bold mb-8">Order #{(order.id || order._id)?.slice(-6) || 'N/A'}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Status Timeline */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Order Status</h2>
            <div className="space-y-4">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step.completed ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`w-0.5 h-12 ${
                          step.completed ? 'bg-primary-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <h3
                      className={`font-semibold ${
                        step.current ? 'text-primary-600' : step.completed ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="lg:col-span-1">
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold">Order Details</h2>
            
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="space-y-2">
                {order.items?.map((item, index) => {
                  const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name || `Item ${index + 1}`} x {item.quantity}
                      </span>
                      <span>${(itemPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-4">
              {(() => {
                const totalAmount = typeof order.totalAmount === 'string' 
                  ? parseFloat(order.totalAmount) 
                  : (order.totalAmount || 0);
                const subtotal = order.items?.reduce((sum, item) => {
                  const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                  return sum + (itemPrice * item.quantity);
                }, 0) || totalAmount;
                const deliveryFee = 5;
                const tax = totalAmount - subtotal - deliveryFee;
                
                return (
                  <>
                    <div className="flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Delivery Fee</span>
                      <span>${deliveryFee.toFixed(2)}</span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between mb-2">
                        <span>Tax</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {order.deliveryAddress && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
              </div>
            )}

            {order.restaurant && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Restaurant</h3>
                <p className="text-sm text-gray-600">{order.restaurant.name}</p>
              </div>
            )}

            {/* Rider Information */}
            {order.rider && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Rider Assigned</h3>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary-600">
                    {order.rider.name || order.rider.email || 'Rider'}
                  </p>
                  {order.rider.phone && (
                    <p className="text-sm text-gray-600">Phone: {order.rider.phone}</p>
                  )}
                  {order.rider.vehicleNumber && (
                    <p className="text-sm text-gray-600">Vehicle: {order.rider.vehicleNumber}</p>
                  )}
                  <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Your order has been accepted by a rider!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {order.riderId && !order.rider && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Rider Assigned</h3>
                <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Your order has been accepted by a rider!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
