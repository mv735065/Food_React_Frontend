import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { restaurantAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import MenuCard from '../components/MenuCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const RestaurantMenu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, restaurantId: cartRestaurantId } = useCart();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, [id]);

  const fetchRestaurantAndMenu = async () => {
    try {
      setLoading(true);
      const [restaurantRes, menuRes] = await Promise.all([
        restaurantAPI.getById(id),
        restaurantAPI.getMenu(id),
      ]);
      
      // Handle nested response structure for restaurant
      const restaurantData = restaurantRes.data?.data || restaurantRes.data;
      const restaurant = restaurantData?.restaurant || restaurantData;
      setRestaurant(restaurant);
      
      // Handle nested response structure for menu: { status: "success", data: { menuItems: [...] } }
      const menuResponseData = menuRes.data?.data || menuRes.data;
      const menuItems = menuResponseData?.menuItems || menuResponseData || [];
      
      // Filter only available items and normalize data
      const availableMenuItems = Array.isArray(menuItems) 
        ? menuItems
            .filter(item => item.isAvailable !== false)
            .map(item => ({
              ...item,
              id: item.id || item._id,
              price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0),
              image: item.image || item.imageUrl,
            }))
        : [];
      
      setMenu(availableMenuItems);
    } catch (err) {
      setError('Failed to load restaurant menu. Please try again.');
      console.error('Error fetching restaurant menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    addItem(item, id);
    setToast({ message: `${item.name} added to cart!`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Restaurant not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Restaurant Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Back to Restaurants
        </button>
        <div className="card">
          {(restaurant.image || restaurant.imageUrl) && (
            <img
              src={restaurant.image || restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}
          <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
          <p className="text-gray-600 mb-2">{restaurant.cuisineType || restaurant.cuisine}</p>
          <p className="text-gray-700">{restaurant.address}</p>
          {restaurant.description && (
            <p className="text-gray-600 mt-2">{restaurant.description}</p>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <h2 className="text-2xl font-bold mb-6">Menu</h2>
      {menu.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No menu items available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menu.map((item) => (
            <MenuCard
              key={item.id || item._id}
              item={item}
              restaurantId={id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
