import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const ManageRestaurants = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    address: '',
    image: '',
  });
  const [toast, setToast] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});

  useEffect(() => {
    fetchRestaurants();
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

  const handleCardClick = (restaurantId, e) => {
    // Don't navigate if clicking on menu or menu button
    if (e?.target.closest('.menu-container')) {
      return;
    }
    navigate(`/restaurants/${restaurantId}/menu`);
  };

  const handleMenuToggle = (e, restaurantId) => {
    e.stopPropagation(); // Prevent card click
    setOpenMenuId(openMenuId === restaurantId ? null : restaurantId);
  };

  const handleEditClick = (e, restaurant) => {
    e.stopPropagation();
    e.preventDefault();
    setOpenMenuId(null);
    console.log('Edit clicked for restaurant:', restaurant);
    handleEdit(restaurant);
  };

  const handleDeleteClick = (e, restaurantId) => {
    e.stopPropagation();
    e.preventDefault();
    setOpenMenuId(null);
    console.log('Delete clicked for restaurant:', restaurantId);
    handleDelete(restaurantId);
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRestaurants();
      // Handle nested response structure: response.data.data.restaurants
      const restaurantsData = response.data?.data?.restaurants || response.data?.restaurants || response.data || [];
      setRestaurants(Array.isArray(restaurantsData) ? restaurantsData : []);
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
      setToast({ message: 'Failed to load restaurants', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const restaurantId = editingRestaurant?.id || editingRestaurant?._id;
      // Map form data to backend expected format
      const restaurantData = {
        name: formData.name.trim(),
        cuisineType: formData.cuisine.trim(),
        address: formData.address.trim(),
      };
      
      // Only include imageUrl if provided
      if (formData.image.trim()) {
        restaurantData.imageUrl = formData.image.trim();
      }
      
      console.log('Submitting restaurant data:', restaurantData);
      console.log('Editing restaurant:', editingRestaurant);
      console.log('Restaurant ID:', restaurantId);
      
      if (editingRestaurant) {
        console.log('Calling updateRestaurant API...');
        const response = await adminAPI.updateRestaurant(restaurantId, restaurantData);
        console.log('Update response:', response);
        setToast({ message: 'Restaurant updated successfully', type: 'success' });
      } else {
        console.log('Calling createRestaurant API...');
        const response = await adminAPI.createRestaurant(restaurantData);
        console.log('Create response:', response);
        setToast({ message: 'Restaurant created successfully', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingRestaurant(null);
      setFormData({ name: '', cuisine: '', address: '', image: '' });
      fetchRestaurants();
    } catch (error) {
      console.error('Failed to save restaurant:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save restaurant';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const handleEdit = (restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name || '',
      cuisine: restaurant.cuisineType || restaurant.cuisine || '',
      address: restaurant.address || '',
      image: restaurant.imageUrl || restaurant.image || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (restaurantId) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) return;

    try {
      console.log('Calling deleteRestaurant API for:', restaurantId);
      const response = await adminAPI.deleteRestaurant(restaurantId);
      console.log('Delete response:', response);
      setToast({ message: 'Restaurant deleted successfully', type: 'success' });
      fetchRestaurants();
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete restaurant';
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
        <h1 className="text-3xl font-bold">Manage Restaurants</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          Add Restaurant
        </button>
      </div>

      {restaurants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No restaurants found.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            Add Restaurant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => {
            const restaurantId = restaurant.id || restaurant._id;
            const imageUrl = restaurant.imageUrl || restaurant.image;
            const cuisine = restaurant.cuisineType || restaurant.cuisine;
            const menuItemCount = restaurant.menuItems?.length || 0;
            const isMenuOpen = openMenuId === restaurantId;
            
            return (
              <div
                key={restaurantId}
                onClick={(e) => handleCardClick(restaurantId, e)}
                className="card cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group relative"
              >
                {/* Three dots menu */}
                <div 
                  className="absolute top-4 right-4 z-10 menu-container" 
                  ref={(el) => menuRefs.current[restaurantId] = el}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => handleMenuToggle(e, restaurantId)}
                    className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
                    aria-label="Menu options"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleEditClick(e, restaurant);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Restaurant</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteClick(e, restaurantId);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete Restaurant</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Restaurant Image */}
                <div className="relative overflow-hidden rounded-lg mb-4 h-48 bg-gray-200">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                  {/* Status badge */}
                  {restaurant.isActive !== false && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Active
                    </div>
                  )}
                </div>

                {/* Restaurant Info */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {restaurant.name}
                  </h3>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium">{cuisine}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{restaurant.address}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{menuItemCount} Menu Items</span>
                    </div>
                    {restaurant.owner && (
                      <div className="text-xs text-gray-400 truncate max-w-[120px]">
                        {restaurant.owner.name || restaurant.owner.email}
                      </div>
                    )}
                  </div>

                  {/* Click hint */}
                  <div className="pt-2 text-xs text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to manage menu →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRestaurant(null);
          setFormData({ name: '', cuisine: '', address: '', image: '' });
        }}
        title={editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine *</label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.cuisine}
              onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
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
          <div className="flex space-x-4">
            <button type="submit" className="btn-primary flex-1">
              {editingRestaurant ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingRestaurant(null);
                setFormData({ name: '', cuisine: '', address: '', image: '' });
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

export default ManageRestaurants;
