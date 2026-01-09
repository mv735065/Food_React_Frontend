import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';

const Cart = () => {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL to checkout
      navigate('/login?returnUrl=/checkout');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">Add some delicious items to your cart!</p>
          <button onClick={() => navigate('/restaurants')} className="btn-primary">
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton to="/restaurants" />
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const itemId = item.id || item._id;
            const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
            const imageUrl = item.image || item.imageUrl;
            
            return (
              <div key={itemId} className="card flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-gray-600 text-sm">₹{itemPrice.toFixed(2)} each</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <button
                      onClick={() => updateQuantity(itemId, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 flex items-center justify-center font-bold text-lg shadow-sm hover:shadow-md"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-bold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(itemId, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200 flex items-center justify-center font-bold text-lg shadow-sm hover:shadow-md"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-lg w-24 text-right text-gray-900">
                    ₹{(itemPrice * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(itemId)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Remove item"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₹5.00</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹{(totalPrice * 0.1).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{(totalPrice + 5 + totalPrice * 0.1).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={handleCheckout} className="btn-primary w-full mb-2">
              Proceed to Checkout
            </button>
            <button onClick={clearCart} className="btn-secondary w-full">
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
