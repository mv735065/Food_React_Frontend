import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const ManageRestaurants = () => {
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

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRestaurants();
      setRestaurants(response.data || []);
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
      if (editingRestaurant) {
        await adminAPI.updateRestaurant(editingRestaurant._id, formData);
        setToast({ message: 'Restaurant updated successfully', type: 'success' });
      } else {
        await adminAPI.createRestaurant(formData);
        setToast({ message: 'Restaurant created successfully', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingRestaurant(null);
      setFormData({ name: '', cuisine: '', address: '', image: '' });
      fetchRestaurants();
    } catch (error) {
      setToast({ message: 'Failed to save restaurant', type: 'error' });
    }
  };

  const handleEdit = (restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name || '',
      cuisine: restaurant.cuisine || '',
      address: restaurant.address || '',
      image: restaurant.image || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (restaurantId) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) return;

    try {
      await adminAPI.deleteRestaurant(restaurantId);
      setToast({ message: 'Restaurant deleted successfully', type: 'success' });
      fetchRestaurants();
    } catch (error) {
      setToast({ message: 'Failed to delete restaurant', type: 'error' });
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
          {restaurants.map((restaurant) => (
            <div key={restaurant._id} className="card">
              {restaurant.image && (
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="text-xl font-semibold mb-2">{restaurant.name}</h3>
              <p className="text-gray-600 mb-2">{restaurant.cuisine}</p>
              <p className="text-sm text-gray-500 mb-4">{restaurant.address}</p>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(restaurant)} className="btn-secondary flex-1">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(restaurant._id)}
                  className="btn-secondary bg-red-500 hover:bg-red-600 text-white flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
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
