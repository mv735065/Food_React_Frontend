import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';

const MenuCard = ({ item, restaurantId }) => {
  const { addItem, items, updateQuantity } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(0);

  // Check if item is in cart and get its quantity
  useEffect(() => {
    const itemId = item.id || item._id;
    const cartItem = items.find((i) => (i.id || i._id) === itemId);
    if (cartItem) {
      setItemQuantity(cartItem.quantity);
      setIsAdded(true);
    } else {
      setItemQuantity(0);
      setIsAdded(false);
    }
  }, [items, item.id, item._id]);

  const handleAddToCart = () => {
    addItem(item, restaurantId);
    setIsAdded(true);
    setItemQuantity(1);
  };

  const handleIncreaseQuantity = () => {
    const itemId = item.id || item._id;
    updateQuantity(itemId, itemQuantity + 1);
  };

  const handleDecreaseQuantity = () => {
    const itemId = item.id || item._id;
    if (itemQuantity > 1) {
      updateQuantity(itemId, itemQuantity - 1);
    } else {
      // Remove from cart if quantity becomes 0
      updateQuantity(itemId, 0);
      setIsAdded(false);
      setItemQuantity(0);
    }
  };

  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
  
  // Get image URL - check for valid non-empty strings
  const getImageUrl = () => {
    const img = item.image || item.imageUrl;
    if (img && typeof img === 'string' && img.trim() !== '') {
      return img.trim();
    }
    // Fallback to placeholder with item name
    return `https://placehold.co/600x400?text=${encodeURIComponent(item.name || 'Menu Item')}`;
  };
  
  const imageUrl = getImageUrl();

  const description = item.description || 'No description';

  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full transform hover:-translate-y-2 max-w-[320px] w-full mx-auto">
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        <img
          src={imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.src = `https://placehold.co/600x400?text=${encodeURIComponent(item.name || 'Menu Item')}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Category Badge */}
        {item.category && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-800 shadow-lg">
            {item.category}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-white font-semibold text-sm">Click to add to cart →</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
          {item.name}
        </h3>
        <p className="text-gray-600 mb-4 text-sm line-clamp-2 flex-1" title={description}>
          {description}
        </p>
        
        {/* Price and Add/Quantity Controls */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium">Price</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                ₹{price.toFixed(2)}
              </div>
            </div>
            
            {isAdded ? (
              <div className="flex items-center space-x-3 bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-2">
                <button
                  onClick={handleDecreaseQuantity}
                  className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 text-orange-600 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 flex items-center justify-center font-bold text-lg shadow-sm hover:shadow-md"
                >
                  −
                </button>
                <div className="flex flex-col items-center">
                  {/* <span className="text-xs text-green-600 font-medium">In Cart</span> */}
                  <span className="text-lg font-bold text-orange-500">{itemQuantity}</span>
                </div>
                <button
                  onClick={handleIncreaseQuantity}
                  className="w-8 h-8 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition-all duration-200 flex items-center justify-center font-bold text-lg shadow-sm hover:shadow-md"
                >
                  +
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAddToCart} 
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
