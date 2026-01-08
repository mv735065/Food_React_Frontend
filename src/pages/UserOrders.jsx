import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import OrderCard from '../components/OrderCard';
import LoadingSpinner from '../components/LoadingSpinner';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getByUser();
      setOrders(response.data || []);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">You haven't placed any orders yet.</p>
          <Link to="/restaurants" className="btn-primary">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserOrders;
