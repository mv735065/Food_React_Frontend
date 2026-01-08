import { useCart } from '../contexts/CartContext';

const MenuCard = ({ item, restaurantId }) => {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(item, restaurantId);
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img
        src={imageUrl}
        alt={item.name}
        className="w-full h-48 object-cover rounded-t-lg"
        onError={(e) => {
          // If image fails to load, use placeholder
          e.target.src = `https://placehold.co/600x400?text=${encodeURIComponent(item.name || 'Menu Item')}`;
        }}
      />
      <div className="p-2 m-2">
        <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
        <p className="text-gray-600 mb-2 text-sm truncate" title={item.description || 'No description'}>
                    {item.description || 'No description'}
                  </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary-600">
            ${price.toFixed(2)}
          </span>
          <button onClick={handleAddToCart} className="btn-primary">
            Add to Cart
          </button>
        </div>
        {item.category && (
          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            {item.category}
          </span>
        )}
      </div>
    </div>
  );
};

export default MenuCard;
