import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { restaurantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const ManageMenu = () => {
  const { id: restaurantId } = useParams();
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    available: true,
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (restaurantId) {
      fetchMenu();
    }
  }, [restaurantId]);

  const fetchMenu = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      // Use getMenuAll to get all menu items including unavailable (owner/admin only)
      const response = await restaurantAPI.getMenuAll(restaurantId);
      
      // Handle nested response structure: { status: "success", data: { menuItems: [...] } }
      const responseData = response.data?.data || response.data;
      const menuItems = responseData?.menuItems || responseData || [];
      
      console.log('Fetched menu items:', menuItems);
      setMenuItems(Array.isArray(menuItems) ? menuItems : []);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      setToast({ message: 'Failed to load menu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!restaurantId) {
      setToast({ message: 'No restaurant selected', type: 'error' });
      return;
    }
    
    try {
      // Prepare data for API - convert available to isAvailable if needed
      const menuItemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        isAvailable: formData.available,
      };

      // Category is required
      menuItemData.category = formData.category.trim();
      if (formData.image.trim()) {
        menuItemData.imageUrl = formData.image.trim(); // Backend expects imageUrl
      }

      if (editingItem) {
        // Use new PUT endpoint for updating menu items
        const itemId = editingItem.id || editingItem._id;
        await restaurantAPI.updateMenuItem(restaurantId, itemId, menuItemData);
        setToast({ message: 'Menu item updated successfully', type: 'success' });
      } else {
        // Add new item using POST
        await restaurantAPI.createMenuItem(restaurantId, menuItemData);
        setToast({ message: 'Menu item added successfully', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', category: '', image: '', available: true });
      fetchMenu();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Failed to save menu item', type: 'error' });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: typeof item.price === 'string' ? item.price : (item.price?.toString() || ''),
      category: item.category || '',
      image: item.image || item.imageUrl || '',
      available: item.isAvailable !== false && item.available !== false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    if (!restaurantId) {
      setToast({ message: 'No restaurant selected', type: 'error' });
      return;
    }
    
    try {
      // Use new DELETE endpoint for menu items
      await restaurantAPI.deleteMenuItem(restaurantId, itemId);
      setToast({ message: 'Menu item deleted successfully', type: 'success' });
      fetchMenu();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Failed to delete menu item', type: 'error' });
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
        <h1 className="text-3xl font-bold">Manage Menu</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          Add Menu Item
        </button>
      </div>

      {menuItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No menu items yet. Add your first item!</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            Add Menu Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const itemId = item.id || item._id;
            const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
            const isAvailable = item.isAvailable !== false && item.available !== false;
            const imageUrl = item.image || item.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(item.name || 'Menu Item')}`;
            
            return (
              <div key={itemId} className="bg-white rounded-lg shadow-md overflow-hidden">
                {imageUrl && (
                  <img src={imageUrl} alt={item.name} className="w-full h-48 object-cover" />
                )}
                <div className="p-2 mx-2 mb-0">
                  <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
                  <p className="text-gray-600 mb-2 text-sm truncate" title={item.description || 'No description'}>
                    {item.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold text-primary-600">
                      ${price.toFixed(2)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  {item.category && (
                    <span className="inline-block mb-3 px-2 py-1 text-gray-600 text-xs rounded">
                      {item.category}
                    </span>
                  )}
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(item)} className="btn-secondary flex-1 text-sm py-1.5">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(itemId)} className="btn-secondary bg-red-500 hover:bg-red-600 text-white flex-1 text-sm py-1.5">
                      Delete
                    </button>
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
          setEditingItem(null);
          setFormData({ name: '', description: '', price: '', category: '', image: '', available: true });
        }}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input-field"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              required
              className="input-field"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select Category</option>
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
              <option value="eggitarian">Eggitarian</option>
            </select>
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
          <div className="flex items-center">
            <input
              type="checkbox"
              id="available"
              className="mr-2"
              checked={formData.available}
              onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
            />
            <label htmlFor="available" className="text-sm font-medium text-gray-700">
              Available
            </label>
          </div>
          <div className="flex space-x-4">
            <button type="submit" className="btn-primary flex-1">
              {editingItem ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
                setFormData({ name: '', description: '', price: '', category: '', image: '', available: true });
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

export default ManageMenu;
