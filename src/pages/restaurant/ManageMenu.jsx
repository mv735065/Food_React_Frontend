import { useState, useEffect } from 'react';
import { restaurantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const ManageMenu = () => {
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
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    // In a real app, get restaurant ID from user profile or API
    // For now, we'll assume it's in user.restaurantId
    if (user?.restaurantId) {
      setRestaurantId(user.restaurantId);
      fetchMenu();
    }
  }, [user]);

  const fetchMenu = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const response = await restaurantAPI.getMenu(restaurantId);
      setMenuItems(response.data || []);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      setToast({ message: 'Failed to load menu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Update existing item
        await restaurantAPI.updateMenu(restaurantId, {
          ...formData,
          _id: editingItem._id,
          price: parseFloat(formData.price),
        });
        setToast({ message: 'Menu item updated successfully', type: 'success' });
      } else {
        // Add new item
        await restaurantAPI.updateMenu(restaurantId, {
          ...menuItems,
          items: [...menuItems, { ...formData, price: parseFloat(formData.price) }],
        });
        setToast({ message: 'Menu item added successfully', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', category: '', image: '', available: true });
      fetchMenu();
    } catch (error) {
      setToast({ message: 'Failed to save menu item', type: 'error' });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category || '',
      image: item.image || '',
      available: item.available !== false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
      const updatedMenu = menuItems.filter(item => item._id !== itemId);
      await restaurantAPI.updateMenu(restaurantId, { items: updatedMenu });
      setToast({ message: 'Menu item deleted successfully', type: 'success' });
      fetchMenu();
    } catch (error) {
      setToast({ message: 'Failed to delete menu item', type: 'error' });
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
          {menuItems.map((item) => (
            <div key={item._id} className="card">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-full h-48 object-cover rounded-lg mb-4" />
              )}
              <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
              <p className="text-gray-600 mb-2 text-sm">{item.description}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-primary-600">
                  ${item.price?.toFixed(2) || '0.00'}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              {item.category && (
                <span className="inline-block mb-4 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {item.category}
                </span>
              )}
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(item)} className="btn-secondary flex-1">
                  Edit
                </button>
                <button onClick={() => handleDelete(item._id)} className="btn-secondary bg-red-500 hover:bg-red-600 text-white flex-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              className="input-field"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
