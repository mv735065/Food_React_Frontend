import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, isAuthenticated, logout, isRestaurant, isRider, isAdmin } = useAuth();
  const { distinctItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">FoodApp</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {!isAuthenticated ? (
              <>
                <Link to="/restaurants" className="text-gray-700 hover:text-primary-600">
                  Restaurants
                </Link>
                <Link to="/login" className="text-gray-700 hover:text-primary-600">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                {!isRestaurant && !isRider && !isAdmin && (
                  <>
                    <Link to="/restaurants" className="text-gray-700 hover:text-primary-600">
                      Restaurants
                    </Link>
                    <Link to="/orders" className="text-gray-700 hover:text-primary-600">
                      My Orders
                    </Link>
                    <Link
                      to="/cart"
                      className="relative text-gray-700 hover:text-primary-600 flex items-center space-x-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {/* <span>Cart</span> */}
                      {distinctItems > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {distinctItems}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                {isRestaurant && (
                  <>
                    <Link to="/restaurant/dashboard" className="text-gray-700 hover:text-primary-600">
                      Dashboard
                    </Link>
                    <Link to="/restaurant/my-restaurants" className="text-gray-700 hover:text-primary-600">
                      My Restaurants
                    </Link>
                    <Link to="/restaurant/all-orders" className="text-gray-700 hover:text-primary-600">
                      All Orders
                    </Link>
                  </>
                )}

                {isRider && (
                  <>
                    <Link to="/rider/dashboard" className="text-gray-700 hover:text-primary-600">
                      Dashboard
                    </Link>
                    <Link to="/rider/available-orders" className="text-gray-700 hover:text-primary-600">
                      Available Orders
                    </Link>
                    <Link to="/rider/orders" className="text-gray-700 hover:text-primary-600">
                      Assigned Orders
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <Link to="/admin/users" className="text-gray-700 hover:text-primary-600">
                      Users
                    </Link>
                    <Link to="/admin/restaurants" className="text-gray-700 hover:text-primary-600">
                      Restaurants
                    </Link>
                    <Link to="/admin/orders" className="text-gray-700 hover:text-primary-600">
                      Orders
                    </Link>
                  </>
                )}

                <NotificationBell />

                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">{user?.name || user?.email}</span>
                  <button onClick={handleLogout} className="btn-secondary flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {/* <span>Logout</span> */}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
