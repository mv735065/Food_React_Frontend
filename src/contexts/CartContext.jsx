import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        setItems(cartData.items || []);
        setRestaurantId(cartData.restaurantId || null);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify({ items, restaurantId }));
  }, [items, restaurantId]);

  const addItem = (item, newRestaurantId) => {
    setItems((prevItems) => {
      // If adding from a different restaurant, clear cart
      if (restaurantId !== null && newRestaurantId !== restaurantId && prevItems.length > 0) {
        const confirmClear = window.confirm(
          'Your cart contains items from another restaurant. Do you want to clear it and add items from this restaurant?'
        );
        if (!confirmClear) return prevItems;
        setRestaurantId(newRestaurantId);
        return [{ ...item, quantity: 1 }];
      }

      setRestaurantId(newRestaurantId);
      // Normalize item ID - use id or _id
      const itemId = item.id || item._id;
      const existingItem = prevItems.find((i) => (i.id || i._id) === itemId);
      
      if (existingItem) {
        return prevItems.map((i) => {
          const iId = i.id || i._id;
          return iId === itemId ? { ...i, quantity: i.quantity + 1 } : i;
        });
      }
      
      // Normalize price to number
      const normalizedItem = {
        ...item,
        id: item.id || item._id,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || 0),
        quantity: 1
      };
      
      return [...prevItems, normalizedItem];
    });
  };

  const removeItem = (itemId) => {
    setItems((prevItems) => prevItems.filter((i) => (i.id || i._id) !== itemId));
    if (items.length === 1) {
      setRestaurantId(null);
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    setItems((prevItems) =>
      prevItems.map((i) => {
        const iId = i.id || i._id;
        return iId === itemId ? { ...i, quantity } : i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctItems = items.length; // Count of distinct/unique items
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const value = {
    items,
    restaurantId,
    totalItems,
    distinctItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
