import { useState, useEffect } from 'react';
import { riderAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const RiderOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchOrders();

    // Listen for order assignments via socket
    const socket = getSocket();
    if (socket) {
      const handleNewAssignment = (data) => {
        setToast({ message: `New order assigned: #${data.orderId.slice(-6)}`, type: 'info' });
        fetchOrders();
      };

      socket.on('order_assigned', handleNewAssignment);
      socket.on('order_update', () => fetchOrders());

      return () => {
        socket.off('order_assigned', handleNewAssignment);
        socket.off('order_update');
      };
    }
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await riderAPI.getAssignedOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setToast({ message: 'Failed to load orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await riderAPI.acceptOrder(orderId);
      setToast({ message: 'Order accepted successfully', type: 'success' });
      fetchOrders();
    } catch (error) {
      setToast({ message: 'Failed to accept order', type: 'error' });
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await riderAPI.updateOrderStatus(orderId, newStatus);
      setToast({ message: 'Order status updated successfully', type: 'success' });
      fetchOrders();
    } catch (error) {
      setToast({ message: 'Failed to update order status', type: 'error' });
    }
  };

  const availableOrders = orders.filter((o) => o.status === 'ready');
  const myOrders = orders.filter((o) => 
    ['picked_up', 'delivered'].includes(o.status) || 
    (o.riderId && o.status !== 'delivered' && o.status !== 'cancelled')
  );

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

      <h1 className="text-3xl font-bold mb-8">Assigned Orders</h1>

      {/* Available Orders */}
      {availableOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Available Orders</h2>
          <div className="space-y-4">
            {availableOrders.map((order) => (
              <div key={order._id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Order #{order._id.slice(-6)}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Restaurant: {order.restaurant?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Delivery to: {order.deliveryAddress || 'N/A'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    READY
                  </span>
                </div>
                <div className="mb-4">
                  <p className="font-medium">Total: ${order.totalAmount?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-gray-600">Delivery Fee: $5.00</p>
                </div>
                <button
                  onClick={() => acceptOrder(order._id)}
                  className="btn-primary w-full"
                >
                  Accept Order
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Orders */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">My Orders</h2>
        {myOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No assigned orders yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order) => (
              <div key={order._id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Order #{order._id.slice(-6)}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Restaurant: {order.restaurant?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Delivery to: {order.deliveryAddress || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Phone: {order.phoneNumber || 'N/A'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'picked_up' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="mb-4">
                  <p className="font-medium">Total: ${order.totalAmount?.toFixed(2) || '0.00'}</p>
                </div>
                {order.status === 'confirmed' && (
                  <button
                    onClick={() => updateOrderStatus(order._id, 'picked_up')}
                    className="btn-primary w-full"
                  >
                    Mark as Picked Up
                  </button>
                )}
                {order.status === 'picked_up' && (
                  <button
                    onClick={() => updateOrderStatus(order._id, 'delivered')}
                    className="btn-primary w-full"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderOrders;
