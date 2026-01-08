import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { restaurantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const MyRestaurants = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchMyRestaurants();
  }, []);

  const fetchMyRestaurants = async () => {
    try {
      setLoading(true);
      const response = await restaurantAPI.getMyRestaurants();
      
      // Handle nested response structure
      const responseData = response.data?.data || response.data;
      const restaurantsList = Array.isArray(responseData?.restaurants) 
        ? responseData.restaurants 
        : Array.isArray(responseData) 
          ? responseData 
          : [];
      
      setRestaurants(restaurantsList);
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
      setToast({ message: 'Failed to load restaurants', type: 'error' });
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
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Restaurants</h1>
        <Link to="/restaurant/" className="btn-primary">
          Add New Restaurant
        </Link>
      </div>

      {restaurants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">You don't have any restaurants yet.</p>
          <Link to="/restaurant/" className="btn-primary">
            Create Your First Restaurant
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => {
            const restaurantId = restaurant.id || restaurant._id;
            const imageUrl =
              restaurant.image || 'https://placehold.co/600x400?text=Restaurant';

            return (
              <div
                key={restaurantId}
                className="card hover:shadow-2xl transition-shadow overflow-hidden flex flex-col"
              >
                {/* Top image */}
                <div className="relative w-full h-40 md:h-48 bg-gray-100">
                  <img
                    src={imageUrl}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="px-2 py-1 text-xs rounded-full bg-black/40 backdrop-blur">
                      {restaurant.cuisine || 'Cuisine'}
                    </span>
                  </div>
                </div>

                {/* Content + actions */}
                <div className="p-4 flex flex-col flex-1 space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{restaurant.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {restaurant.description || restaurant.cuisine || 'No description'}
                    </p>
                  </div>

                  {restaurant.address && (
                    <p className="text-gray-500 text-sm flex items-start">
                      <span className="mr-2">📍</span>
                      <span>{restaurant.address}</span>
                    </p>
                  )}

                  <div className="mt-auto grid grid-cols-1 gap-2">
                    <Link
                      to={`/restaurants/${restaurantId}/menu`}
                      className="btn-primary text-center w-full"
                    >
                      Manage Menu
                    </Link>
                    <Link
                      to={`/restaurants/${restaurantId}/orders`}
                      className="btn-secondary text-center w-full"
                    >
                      View Orders
                    </Link>
                    <Link
                      to={`/restaurants/${restaurantId}/dashboard`}
                      className="text-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRestaurants;
