import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { restaurantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import BackButton from '../../components/BackButton';
import { useCachedApi } from '../../hooks/useCachedApi';
import { useApiCache } from '../../contexts/ApiCacheContext';

const MyRestaurants = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cache = useApiCache();
  const [toast, setToast] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    description: '',
    address: '',
    image: '',
    phone: '',
  });
  const menuRefs = useRef({});

  useEffect(() => {
    fetchMyRestaurants();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId) {
        const menuRef = menuRefs.current[openMenuId];
        if (menuRef && !menuRef.contains(event.target)) {
          setOpenMenuId(null);
        }
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Use cached API call
  const { data: restaurantsData, loading, refetch } = useCachedApi(
    () => restaurantAPI.getMyRestaurants(),
    'restaurants/my-restaurants',
    {},
    [user]
  );

  // Extract restaurants from response
  const restaurants = restaurantsData?.restaurants || restaurantsData || [];
  
  const fetchMyRestaurants = () => {
    refetch();
  };

  const handleMenuToggle = (e, restaurantId) => {
    e.stopPropagation();
    e.preventDefault();
    setOpenMenuId(openMenuId === restaurantId ? null : restaurantId);
  };

  const handleCardClick = (restaurantId) => {
    if (!openMenuId) {
      navigate(`/restaurants/${restaurantId}/menu`);
    }
  };

  const handleEditClick = (e, restaurant) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name || '',
      cuisine: restaurant.cuisineType || restaurant.cuisine || '',
      description: restaurant.description || '',
      address: restaurant.address || '',
      image: restaurant.imageUrl || restaurant.image || '',
      phone: restaurant.phoneNumber || restaurant.phone || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingRestaurant) return;

    try {
      const restaurantId = editingRestaurant.id || editingRestaurant._id;
      const restaurantData = {
        name: formData.name.trim(),
        cuisineType: formData.cuisine.trim(),
        address: formData.address.trim(),
      };

      if (formData.description.trim()) {
        restaurantData.description = formData.description.trim();
      }
      if (formData.image.trim()) {
        restaurantData.imageUrl = formData.image.trim();
      }
      if (formData.phone.trim()) {
        restaurantData.phoneNumber = formData.phone.trim();
      }

      await restaurantAPI.update(restaurantId, restaurantData);
      // Invalidate cache to force refresh
      cache.invalidate('restaurants/my-restaurants');
      setToast({ message: 'Restaurant updated successfully', type: 'success' });
      setIsModalOpen(false);
      setEditingRestaurant(null);
      setFormData({ name: '', cuisine: '', description: '', address: '', image: '', phone: '' });
      fetchMyRestaurants();
    } catch (error) {
      console.error('Failed to update restaurant:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update restaurant';
      setToast({ message: errorMessage, type: 'error' });
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Restaurants</h1>
          <p className="text-gray-600">Manage your restaurants, menus, and orders</p>
        </div>
        <Link to="/restaurant/" className="btn-primary inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Restaurant
        </Link>
      </div>

      {restaurants.length === 0 ? (
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <svg className="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Restaurants Yet</h3>
            <p className="text-gray-500 mb-6">Start by creating your first restaurant to manage menus and orders.</p>
            <Link to="/restaurant/" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Restaurant
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => {
            const restaurantId = restaurant.id || restaurant._id;
            const imageUrl =
              restaurant.imageUrl || 'https://placehold.co/600x400?text=Restaurant';

            return (
              <div
                key={restaurantId}
                onClick={() => handleCardClick(restaurantId)}
                className="card cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col group relative transform hover:-translate-y-1"
              >
                {/* Three dots menu - only visible on hover */}
                <div 
                  className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                  ref={(el) => menuRefs.current[restaurantId] = el}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => handleMenuToggle(e, restaurantId)}
                    className="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all duration-200 hover:scale-110"
                    aria-label="Menu options"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  {openMenuId === restaurantId && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-20 border border-gray-100 overflow-hidden">
                      <div className="py-1">
                        <Link
                          to={`/restaurants/${restaurantId}/menu`}
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                          }}
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                          Manage Menu
                        </Link>
                        <Link
                          to={`/restaurants/${restaurantId}/orders`}
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                          }}
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          View Orders
                        </Link>
                        <Link
                          to={`/restaurants/${restaurantId}/dashboard`}
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                          }}
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          View Dashboard
                        </Link>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(e, restaurant);
                          }}
                          className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Restaurant
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top image with overlay */}
                <div className="relative w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-white/90 backdrop-blur-sm text-primary-700 border border-primary-200">
                      {restaurant.cuisineType || restaurant.cuisine || 'Cuisine'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 space-y-3 bg-white">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {restaurant.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                      {restaurant.description || restaurant.cuisineType || restaurant.cuisine || 'No description available'}
                    </p>
                  </div>

                  {restaurant.address && (
                    <div className="flex items-start pt-2 border-t border-gray-100">
                      <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-gray-500 text-sm leading-relaxed">{restaurant.address}</p>
                    </div>
                  )}

                  <div className="pt-2 mt-auto">
                    <div className="text-xs text-gray-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Click to manage menu
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Restaurant Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRestaurant(null);
          setFormData({ name: '', cuisine: '', description: '', address: '', image: '', phone: '' });
        }}
        title="Edit Restaurant"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Type *</label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.cuisine}
              onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input-field"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <textarea
              required
              className="input-field"
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              type="url"
              className="input-field"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              pattern="[0-9+\-\s()]+"
              maxLength="20"
              className="input-field"
              placeholder="+1 234 567 8900 or (555) 123-4567"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                setFormData({ ...formData, phone: value });
              }}
            />
          </div>
          <div className="flex space-x-4">
            <button type="submit" className="btn-primary flex-1">
              Update Restaurant
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingRestaurant(null);
                setFormData({ name: '', cuisine: '', description: '', address: '', image: '', phone: '' });
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyRestaurants;
