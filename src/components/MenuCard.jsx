import { useCart } from '../contexts/CartContext';

const MenuCard = ({ item, restaurantId }) => {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(item, restaurantId);
  };

  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
  const imageUrl = item.image || item.imageUrl;

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={item.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      )}
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
        {item.description && (
          <p className="text-gray-600 mb-3 text-sm line-clamp-2">{item.description}</p>
        )}
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
