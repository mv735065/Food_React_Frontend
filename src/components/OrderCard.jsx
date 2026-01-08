import { Link } from 'react-router-dom';

const OrderCard = ({ order }) => {
  const getStatusColor = (status) => {
    const normalizedStatus = (status || '').toUpperCase().replace(/-/g, '_');
    const colors = {
      PENDING: 'bg-gray-100 text-gray-700',
      ACCEPTED: 'bg-gray-200 text-gray-800',
      PREPARING: 'bg-gray-300 text-gray-800',
      READY_FOR_PICKUP: 'bg-gray-400 text-gray-900',
      OUT_FOR_DELIVERY: 'bg-gray-500 text-white',
      DELIVERED: 'bg-gray-600 text-white',
      CANCELLED: 'bg-gray-300 text-gray-800',
      CANCELED: 'bg-gray-300 text-gray-800',
    };
    return colors[normalizedStatus] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const orderId = order.id || order._id;
  const totalAmount = typeof order.totalAmount === 'string' 
    ? parseFloat(order.totalAmount) 
    : (order.totalAmount || 0);
  const status = order.status || 'PENDING';
  const displayStatus = status.replace(/_/g, ' ').replace(/-/g, ' ');

  return (
    <Link
      to={`/orders/${orderId}`}
      className="block"
    >
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Order #{orderId ? orderId.slice(-6).toUpperCase() : 'N/A'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
            {displayStatus}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-2 mb-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Restaurant:</span> {order.restaurant?.name || 'N/A'}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Items:</span> {order.items?.length || 0} item(s)
          </div>
          {order.deliveryAddress && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Delivery:</span> {order.deliveryAddress}
            </div>
          )}
          {order.rider && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Rider:</span> {order.rider.name || order.rider.email || 'N/A'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-lg font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
          <span className="text-sm text-gray-500">View Details →</span>
        </div>
      </div>
    </Link>
  );
};

export default OrderCard;
