import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { restaurantAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import BackButton from '../../components/BackButton';
import { useCachedApi } from '../../hooks/useCachedApi';

const RestaurantDashboard = () => {
  const { id: restaurantId } = useParams();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);

  // Use cached API call
  const { data: ordersData, loading } = useCachedApi(
    () => restaurantAPI.getOrders(restaurantId),
    `restaurant/${restaurantId}/orders`,
    {},
    [restaurantId]
  );

  useEffect(() => {
    if (!ordersData || !restaurantId) return;
    
    // Handle nested response structure: { status: "success", data: { orders: [...] } }
    const responseData = ordersData?.data || ordersData;
    let orders = Array.isArray(responseData?.orders) 
      ? responseData.orders 
      : Array.isArray(responseData) 
        ? responseData 
        : [];
      
    // Normalize order IDs, status, and totalAmount
    orders = orders.map(order => {
      if (!order) return null; // Skip null/undefined orders
      
      const orderId = order.id || order._id;
      if (!orderId) {
        console.warn('Order missing ID:', order);
        return null; // Skip orders without IDs
      }
      
      const status = (order.status || '').toLowerCase();
      const totalAmount = typeof order.totalAmount === 'string' 
        ? parseFloat(order.totalAmount) 
        : (typeof order.totalAmount === 'number' ? order.totalAmount : 0);
      
      return {
        ...order,
        id: String(orderId), // Ensure it's a string
        _id: String(orderId), // Ensure it's a string
        status: status,
        totalAmount: totalAmount,
      };
    }).filter(order => order !== null && (order.id || order._id)); // Filter out null orders and orders without IDs
    
    console.log('Normalized orders:', orders);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(
      (order) => {
        const orderDate = new Date(order.createdAt);
        const status = (order.status || '').toLowerCase();
        return orderDate >= today && status === 'delivered';
      }
    );

    setStats({
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => {
        const status = (o.status || '').toLowerCase();
        return status === 'pending' || status === 'confirmed' || status === 'accepted';
      }).length,
      todayRevenue: todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      activeOrders: orders.filter((o) => {
        const status = (o.status || '').toLowerCase();
        return ['preparing', 'ready', 'picked_up', 'accepted'].includes(status);
      }).length,
    });

    setRecentOrders(orders.slice(0, 5));
  }, [ordersData, restaurantId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton to="/restaurant/my-restaurants" />
      <h1 className="text-3xl font-bold mb-8">Restaurant Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-primary-600">{stats.totalOrders}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Pending Orders</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Today's Revenue</h3>
          <p className="text-3xl font-bold text-green-600">${stats.todayRevenue.toFixed(2)}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Active Orders</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.activeOrders}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => {
                  const orderId = order.id || order._id;
                  const orderIdString = orderId ? String(orderId) : null;
                  return (
                  <tr key={orderId || Math.random()}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{orderIdString && orderIdString.length >= 6 ? orderIdString.slice(-6) : (orderIdString || 'N/A')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        (order.status || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' :
                        (order.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        (order.status || '').toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {(order.status || '').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(order.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
