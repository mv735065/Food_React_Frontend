import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { getSocket } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner';
import BackButton from '../components/BackButton';

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
      { 
        key: 'pending', 
        label: 'Order Placed', 
        icon: '📝',
        color: 'from-yellow-400 to-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        textColor: 'text-yellow-800',
      },
      { 
        key: 'accepted', 
        label: 'Order Accepted', 
        icon: '✅',
        color: 'from-blue-400 to-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-800',
      },
      { 
        key: 'preparing', 
        label: 'Preparing Food', 
        icon: '👨‍🍳',
        color: 'from-orange-400 to-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-800',
      },
      { 
        key: 'ready_for_pickup', 
        label: 'Ready for Pickup', 
        icon: '📦',
        color: 'from-purple-400 to-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-800',
      },
      { 
        key: 'out_for_delivery', 
        label: 'Out for Delivery', 
        icon: '🚴',
        color: 'from-indigo-400 to-indigo-500',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-300',
        textColor: 'text-indigo-800',
      },
      { 
        key: 'delivered', 
        label: 'Delivered', 
        icon: '🎉',
        color: 'from-green-400 to-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-800',
      },
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-md">
          {error || 'Order not found'}
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps();
  const currentStep = statusSteps.find(step => step.current);
  const progressPercentage = ((statusSteps.filter(s => s.completed).length / statusSteps.length) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      <div className="container mx-auto px-4 py-8">
        <BackButton to="/orders" />

        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order #{(order.id || order._id)?.slice(-6).toUpperCase() || 'N/A'}
              </h1>
              <p className="text-gray-500">
                {order.restaurant?.name || 'Restaurant'}
              </p>
            </div>
            {currentStep && (
              <div className={`${currentStep.bgColor} ${currentStep.borderColor} border-2 rounded-lg px-6 py-4`}>
                <div className="text-sm font-medium text-gray-600 mb-1">Current Status</div>
                <div className={`text-xl font-bold ${currentStep.textColor} flex items-center space-x-2`}>
                  <span>{currentStep.icon}</span>
                  <span>{currentStep.label}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Status Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Order Progress</h2>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Progress</div>
                  <div className="text-2xl font-bold text-primary-600">{progressPercentage}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Status Steps */}
              <div className="space-y-6">
                {statusSteps.map((step, index) => (
                  <div key={step.key} className="flex items-start group">
                    <div className="flex flex-col items-center mr-4 relative">
                      {/* Step Circle */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                          step.completed
                            ? `bg-gradient-to-br ${step.color} text-white shadow-lg transform scale-110`
                            : step.current
                            ? `bg-gradient-to-br ${step.color} text-white shadow-lg animate-pulse`
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {step.completed ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-base">{step.icon}</span>
                        )}
                      </div>
                      
                      {/* Connecting Line */}
                      {index < statusSteps.length - 1 && (
                        <div
                          className={`w-1 h-12 mt-2 transition-all duration-500 ${
                            step.completed 
                              ? `bg-gradient-to-b ${step.color}` 
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    
                    {/* Step Content */}
                    <div className={`flex-1 pb-8 transition-all duration-300 ${
                      step.current ? 'transform translate-x-2' : ''
                    }`}>
                      <div className={`rounded-lg p-4 transition-all duration-300 ${
                        step.current 
                          ? `${step.bgColor} ${step.borderColor} border-2 shadow-md` 
                          : step.completed
                          ? 'bg-gray-50'
                          : 'bg-white'
                      }`}>
                        <h3
                          className={`text-lg font-bold mb-1 ${
                            step.current 
                              ? step.textColor 
                              : step.completed 
                              ? 'text-gray-900' 
                              : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </h3>
                        {step.current && (
                          <p className={`text-sm ${step.textColor} font-medium animate-pulse`}>
                            In progress...
                          </p>
                        )}
                        {step.completed && !step.current && (
                          <p className="text-sm text-gray-500">
                            Completed
                          </p>
                        )}
                        {!step.completed && !step.current && (
                          <p className="text-sm text-gray-400">
                            Pending
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        {/* Order Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Order Items
            </h2>
            <div className="space-y-3">
              {order.items?.map((item, index) => {
                const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">
                        {item.name || `Item ${index + 1}`}
                      </span>
                      <span className="text-gray-500 text-sm ml-2">x {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-900">₹{(itemPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Order Summary
            </h2>
            <div className="space-y-3">
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
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      <span>₹{deliveryFee.toFixed(2)}</span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax</span>
                        <span>₹{tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t-2 border-gray-200 pt-3 flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-primary-600">₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Delivery Address
              </h2>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{order.deliveryAddress}</p>
            </div>
          )}

          {/* Restaurant Info */}
          {order.restaurant && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Restaurant
              </h2>
              <p className="text-gray-700 font-medium">{order.restaurant.name}</p>
              {order.restaurant.address && (
                <p className="text-sm text-gray-500 mt-1">{order.restaurant.address}</p>
              )}
            </div>
          )}

          {/* Rider Information */}
          {order.rider && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Rider Assigned
              </h2>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3">
                  <p className="font-semibold text-gray-900 text-lg">
                    {order.rider.name || order.rider.email || 'Rider'}
                  </p>
                  {order.rider.phone && (
                    <p className="text-sm text-gray-600 mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {order.rider.phone}
                    </p>
                  )}
                  {order.rider.vehicleNumber && (
                    <p className="text-sm text-gray-600 mt-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Vehicle: {order.rider.vehicleNumber}
                    </p>
                  )}
                </div>
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-semibold flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Your order has been accepted by a rider!
                  </p>
                </div>
              </div>
            </div>
          )}

          {order.riderId && !order.rider && (
            <div className="bg-green-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-800 font-semibold flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Your order has been accepted by a rider!
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
