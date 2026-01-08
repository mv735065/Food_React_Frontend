import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { getSocket } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner';

const OrderStatus = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
    
    // Listen for real-time order updates
    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = (data) => {
        if (data.orderId === id) {
          setOrder((prev) => ({ ...prev, status: data.status }));
        }
      };

      socket.on('order_update', handleOrderUpdate);

      return () => {
        socket.off('order_update', handleOrderUpdate);
      };
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getById(id);
      setOrder(response.data);
    } catch (err) {
      setError('Failed to load order details. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const statuses = [
      { key: 'pending', label: 'Order Placed' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'preparing', label: 'Preparing' },
      { key: 'ready', label: 'Ready' },
      { key: 'picked_up', label: 'Picked Up' },
      { key: 'delivered', label: 'Delivered' },
    ];

    const currentStatusIndex = statuses.findIndex((s) => s.key === order?.status);
    
    return statuses.map((status, index) => ({
      ...status,
      completed: index <= currentStatusIndex,
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

      <h1 className="text-3xl font-bold mb-8">Order #{order._id.slice(-6)}</h1>

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
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.name || `Item ${index + 1}`} x {item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Delivery Fee</span>
                <span>$5.00</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax</span>
                <span>${(order.totalAmount * 0.1 / 1.1).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>${order.totalAmount?.toFixed(2) || '0.00'}</span>
              </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
