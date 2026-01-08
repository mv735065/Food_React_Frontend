import { Link } from 'react-router-dom';

const OrderCard = ({ order }) => {
  const getStatusColor = (status) => {
    // Normalize status to lowercase for comparison
    const normalizedStatus = (status || '').toLowerCase();
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      'picked_up': 'bg-indigo-100 text-indigo-800',
      'picked up': 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      canceled: 'bg-red-100 text-red-800',
    };
    return colors[normalizedStatus] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const orderId = order.id || order._id;
  const totalAmount = typeof order.totalAmount === 'string' 
    ? parseFloat(order.totalAmount) 
    : (order.totalAmount || 0);
  const status = order.status || 'pending';
  const displayStatus = status.replace('_', ' ').replace('-', ' ');

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Order #{orderId ? orderId.slice(-6) : 'N/A'}</h3>
          <p className="text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
          {displayStatus.toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-gray-700">
          <span className="font-medium">Restaurant:</span> {order.restaurant?.name || 'N/A'}
        </p>
        <p className="text-gray-700 mt-1">
          <span className="font-medium">Items:</span> {order.items?.length || 0} item(s)
        </p>
        <p className="text-gray-700 mt-1">
          <span className="font-medium">Total:</span>{' '}
          <span className="text-primary-600 font-bold">
            ${totalAmount.toFixed(2)}
          </span>
        </p>
      </div>

      {order.deliveryAddress && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Delivery to:</span> {order.deliveryAddress}
          </p>
        </div>
      )}

      <Link
        to={`/orders/${orderId}`}
        className="block text-center btn-primary"
      >
        View Details
      </Link>
    </div>
  );
};

export default OrderCard;
