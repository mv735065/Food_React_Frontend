import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { restaurantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const RestaurantOwnerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    activeOrders: 0,
  });
  const [restaurants, setRestaurants] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Get all restaurants owned by the user
      const restaurantsResponse = await restaurantAPI.getMyRestaurants();
      
      console.log('Restaurants API response:', restaurantsResponse.data);
      
      // Handle nested response structure: { status: "success", data: { restaurants: [...] } }
      const responseData = restaurantsResponse.data?.data || restaurantsResponse.data;
      const restaurantsList = Array.isArray(responseData?.restaurants) 
        ? responseData.restaurants 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      console.log('Parsed restaurants:', restaurantsList);
      setRestaurants(restaurantsList);

      // Get orders for all restaurants
      let allOrders = [];
      for (const restaurant of restaurantsList) {
        try {
          const restaurantId = restaurant.id || restaurant._id;
          const ordersResponse = await restaurantAPI.getOrders(restaurantId);
          
          console.log(`Orders for restaurant ${restaurantId}:`, ordersResponse.data);
          
          const responseData = ordersResponse.data?.data || ordersResponse.data;
          const orders = Array.isArray(responseData?.orders) 
            ? responseData.orders 
            : Array.isArray(responseData) 
              ? responseData 
              : [];
          
          console.log(`Parsed orders for ${restaurantId}:`, orders);
          
          // Add restaurant name to each order for display
          const ordersWithRestaurant = orders.map(order => ({
            ...order,
            restaurantName: restaurant.name,
            restaurantId: restaurantId
          }));
          
          allOrders = [...allOrders, ...ordersWithRestaurant];
        } catch (error) {
          console.error(`Failed to fetch orders for restaurant ${restaurant.id}:`, error);
        }
      }

      console.log('All orders:', allOrders);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Normalize status to lowercase for comparison
      const todayOrders = allOrders.filter((order) => {
        const status = (order.status || '').toLowerCase();
        const orderDate = new Date(order.createdAt || order.createdAt);
        return orderDate >= today && status === 'delivered';
      });

      const deliveredOrders = allOrders.filter(order => {
        const status = (order.status || '').toLowerCase();
        return status === 'delivered';
      });

      setStats({
        totalOrders: allOrders.length,
        pendingOrders: allOrders.filter((o) => {
          const status = (o.status || '').toLowerCase();
          return status === 'pending' || status === 'confirmed' || status === 'accepted';
        }).length,
        todayRevenue: todayOrders.reduce((sum, order) => {
          const amount = typeof order.totalAmount === 'string' 
            ? parseFloat(order.totalAmount) 
            : (order.totalAmount || 0);
          return sum + amount;
        }, 0),
        totalRevenue: deliveredOrders.reduce((sum, order) => {
          const amount = typeof order.totalAmount === 'string' 
            ? parseFloat(order.totalAmount) 
            : (order.totalAmount || 0);
          return sum + amount;
        }, 0),
        activeOrders: allOrders.filter((o) => {
          const status = (o.status || '').toLowerCase();
          return ['preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'picked_up'].includes(status);
        }).length,
      });

      // Sort by most recent and take top 10
      const sortedOrders = allOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      }).slice(0, 10);
      
      setRecentOrders(sortedOrders);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      console.error('Error details:', error.response?.data);
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link to="/restaurant/my-restaurants" className="btn-secondary">
          My Restaurants
        </Link>
      </div>

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
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Active Orders</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.activeOrders}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Restaurants</h3>
          <p className="text-3xl font-bold text-purple-600">{restaurants.length}</p>
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
                    Restaurant
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
                  const status = (order.status || '').toLowerCase();
                  const totalAmount = typeof order.totalAmount === 'string' 
                    ? parseFloat(order.totalAmount) 
                    : (order.totalAmount || 0);
                  
                  const getStatusColor = (status) => {
                    const normalizedStatus = (status || '').toLowerCase();
                    if (normalizedStatus === 'delivered') return 'bg-green-100 text-green-800';
                    if (normalizedStatus === 'pending' || normalizedStatus === 'accepted') return 'bg-yellow-100 text-yellow-800';
                    if (normalizedStatus === 'cancelled') return 'bg-red-100 text-red-800';
                    return 'bg-blue-100 text-blue-800';
                  };
                  
                  return (
                    <tr key={orderId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{orderId ? orderId.slice(-6) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.restaurantName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
                          {status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${totalAmount.toFixed(2)}
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

export default RestaurantOwnerDashboard;
