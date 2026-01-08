import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const Checkout = () => {
  const { items, totalPrice, clearCart, restaurantId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    deliveryAddress: user?.address || '',
    phoneNumber: user?.phone || '',
    paymentMethod: 'cash', // Default to cash on delivery since payment is not available
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!restaurantId) {
      setError('No restaurant selected. Please add items to cart.');
      return;
    }

    setLoading(true);

    try {
      // Prepare order items - use id or _id, ensure price is number
      const orderItems = items.map((item) => {
        const menuItemId = item.id || item._id;
        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
        
        if (!menuItemId) {
          throw new Error(`Invalid menu item: ${item.name}`);
        }
        
        return {
          menuItemId,
          quantity: item.quantity,
          price: itemPrice,
        };
      });

      const orderData = {
        restaurantId,
        items: orderItems,
        deliveryAddress: formData.deliveryAddress.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        paymentMethod: formData.paymentMethod,
        totalAmount: grandTotal,
      };

      console.log('Placing order with data:', orderData);

      const response = await orderAPI.create(orderData);
      
      // Handle nested response structure
      const orderId = response.data?.data?.id || response.data?.data?._id || response.data?.id || response.data?._id;
      
      clearCart();
      setToast({ message: 'Order placed successfully!', type: 'success' });
      
      // Navigate to orders page after successful order
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
      setToast({ message: 'Failed to place order', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deliveryFee = 5;
  const tax = totalPrice * 0.1;
  const grandTotal = totalPrice + deliveryFee + tax;

  return (
    <div className="container mx-auto px-4 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address *
                </label>
                <textarea
                  name="deliveryAddress"
                  required
                  className="input-field"
                  rows="3"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  placeholder="Enter your delivery address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  className="input-field"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            <div className="space-y-4">
              <div>
                <select
                  name="paymentMethod"
                  className="input-field"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                >
                  <option value="card">Credit/Debit Card</option>
                  <option value="cash">Cash on Delivery</option>
                </select>
              </div>

              {formData.paymentMethod === 'card' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      className="input-field"
                      value={formData.cardNumber}
                      onChange={handleChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      name="cardName"
                      className="input-field"
                      value={formData.cardName}
                      onChange={handleChange}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        name="expiryDate"
                        className="input-field"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        placeholder="MM/YY"
                        maxLength="5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        name="cvv"
                        className="input-field"
                        value={formData.cvv}
                        onChange={handleChange}
                        placeholder="123"
                        maxLength="3"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    * Payment processing is not available. Order will be placed without payment.
                  </p>
                </>
              )}
              {formData.paymentMethod === 'cash' && (
                <p className="text-sm text-gray-500">
                  Payment will be collected on delivery.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => {
                const itemId = item.id || item._id;
                const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                return (
                  <div key={itemId} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>${(itemPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="border-t pt-2 flex justify-between">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="btn-primary w-full"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Place Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
