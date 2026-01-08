import { useState, useEffect } from 'react';
import { riderAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const RiderDashboard = () => {
  const [stats, setStats] = useState({
    assignedOrders: 0,
    completedToday: 0,
    inTransit: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await riderAPI.getAssignedOrders();
      
      console.log('Rider dashboard API response:', response.data);
      
      // Handle nested response structure: { status: "success", data: { orders: [...] } }
      const responseData = response.data?.data || response.data;
      const orders = Array.isArray(responseData?.orders) 
        ? responseData.orders 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      console.log('Parsed rider orders for dashboard:', orders);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Backend status enum: PENDING, ACCEPTED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
      const todayCompleted = orders.filter((order) => {
        const status = (order.status || '').toUpperCase();
        const orderDate = new Date(order.updatedAt || order.createdAt || order.deliveredAt);
        return status === 'DELIVERED' && orderDate >= today;
      });

      const assignedOrders = orders.filter((o) => {
        const status = (o.status || '').toUpperCase();
        return status !== 'DELIVERED' && status !== 'CANCELLED';
      });
      
      const inTransit = orders.filter((o) => {
        const status = (o.status || '').toUpperCase();
        return status === 'OUT_FOR_DELIVERY';
      });

      setStats({
        assignedOrders: assignedOrders.length,
        completedToday: todayCompleted.length,
        inTransit: inTransit.length,
        totalEarnings: todayCompleted.reduce((sum, order) => {
          const deliveryFee = typeof order.deliveryFee === 'string' 
            ? parseFloat(order.deliveryFee) 
            : (order.deliveryFee || 5);
          return sum + deliveryFee;
        }, 0),
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
      <h1 className="text-3xl font-bold mb-8">Rider Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Assigned Orders</h3>
          <p className="text-3xl font-bold text-primary-600">{stats.assignedOrders}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Completed Today</h3>
          <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">In Transit</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.inTransit}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Today's Earnings</h3>
          <p className="text-3xl font-bold text-green-600">${stats.totalEarnings.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;
