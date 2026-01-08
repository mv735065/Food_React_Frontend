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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  // Get unique categories from menu
  const categories = ['all', ...new Set(menu.map(item => item.category).filter(Boolean))];

  // Filter menu items
  const filteredMenu = menu.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-md">
          {error || 'Restaurant not found'}
        </div>
      </div>
    );
  }

  const restaurantImage = restaurant.image || restaurant.imageUrl || 
    `https://placehold.co/1200x400?text=${encodeURIComponent(restaurant.name || 'Restaurant')}`;
  const cuisine = restaurant.cuisineType || restaurant.cuisine || 'Cuisine';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Restaurant Hero Section */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={restaurantImage}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = `https://placehold.co/1200x400?text=${encodeURIComponent(restaurant.name || 'Restaurant')}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center text-white/90 hover:text-white transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Restaurants
          </button>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">{restaurant.name}</h1>
          <div className="flex items-center space-x-4 flex-wrap">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
              {cuisine}
            </span>
            {restaurant.address && (
              <span className="flex items-center text-white/90 text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {restaurant.address}
              </span>
            )}
          </div>
          {restaurant.description && (
            <p className="mt-3 text-white/90 max-w-2xl">{restaurant.description}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search menu items..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-colors text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <span className="text-gray-700 font-medium whitespace-nowrap">Filter by:</span>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white shadow-lg transform scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All Items' : category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Menu Items
          </h2>
          <span className="text-gray-500">
            {filteredMenu.length} {filteredMenu.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {filteredMenu.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-md">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No items found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter'
                : 'No menu items available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenu.map((item) => (
              <MenuCard
                key={item.id || item._id}
                item={item}
                restaurantId={id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantMenu;
