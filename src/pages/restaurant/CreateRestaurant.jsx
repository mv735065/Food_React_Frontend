import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { restaurantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Toast from '../../components/Toast';
import BackButton from '../../components/BackButton';

const CreateRestaurant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    description: '',
    address: '',
    image: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get owner ID from logged-in user
      const ownerId = user?.id || user?._id;
      if (!ownerId) {
        setToast({ 
          message: 'User information not available. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      // Prepare data - only include fields that have values
      const restaurantData = {
        name: formData.name.trim(),
        cuisineType: formData.cuisine.trim(), // Backend expects cuisineType
        address: formData.address.trim(),
        owner: ownerId, // Include owner ID
      };

      // Add optional fields only if they have values
      if (formData.description.trim()) {
        restaurantData.description = formData.description.trim();
      }
      if (formData.image.trim()) {
        restaurantData.imageUrl = formData.image.trim(); // Backend expects imageUrl
      }
      if (formData.phone.trim()) {
        restaurantData.phoneNumber = formData.phone.trim(); // Backend expects phoneNumber
      }

      console.log('Creating restaurant with data:', restaurantData);
      console.log('API endpoint: POST /restaurants');
      console.log('Owner ID:', ownerId);
      
      const response = await restaurantAPI.create(restaurantData);
      console.log('Restaurant created successfully:', response.data);
      
      setToast({ message: 'Restaurant created successfully!', type: 'success' });
      
      // Redirect to My Restaurants page after a short delay
      setTimeout(() => {
        navigate('/restaurant/my-restaurants');
      }, 1500);
    } catch (error) {
      console.error('Failed to create restaurant:', error);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Failed to create restaurant. Please try again.';
      
      setToast({ 
        message: errorMessage, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="max-w-2xl mx-auto">
        <BackButton to="/restaurant/my-restaurants" />
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Restaurant</h1>
          <p className="text-gray-600">Fill in the details to add your restaurant to the platform</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input-field"
                placeholder="e.g., Pizza Palace"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine Type *
              </label>
              <input
                id="cuisine"
                name="cuisine"
                type="text"
                required
                className="input-field"
                placeholder="e.g., Italian, Chinese, Mexican"
                value={formData.cuisine}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                className="input-field"
                placeholder="Tell customers about your restaurant..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                id="address"
                name="address"
                rows="2"
                required
                className="input-field"
                placeholder="123 Main Street, City, State, ZIP"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                pattern="[0-9+\-\s()]+"
                maxLength="20"
                className="input-field"
                placeholder="+1 234 567 8900 or (555) 123-4567"
                value={formData.phone}
                onChange={(e) => {
                  // Allow only numbers, +, -, spaces, and parentheses
                  const value = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                  setFormData({ ...formData, phone: value });
                }}
              />
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                id="image"
                name="image"
                type="url"
                className="input-field"
                placeholder="https://example.com/restaurant-image.jpg"
                value={formData.image}
                onChange={handleChange}
              />
              {formData.image && (
                <div className="mt-2">
                  <img
                    src={formData.image}
                    alt="Restaurant preview"
                    className="w-full h-48 object-cover rounded-lg border"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Creating...' : 'Create Restaurant'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/restaurant/my-restaurants')}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRestaurant;
