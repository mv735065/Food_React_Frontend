import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, isAuthenticated, logout, isRestaurant, isRider, isAdmin } = useAuth();
  const { totalItems } = useCart();
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
                      className="relative text-gray-700 hover:text-primary-600"
                    >
                      Cart
                      {totalItems > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {totalItems}
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
                    <Link to="/restaurant/menu" className="text-gray-700 hover:text-primary-600">
                      Manage Menu
                    </Link>
                    <Link to="/restaurant/orders" className="text-gray-700 hover:text-primary-600">
                      Orders
                    </Link>
                  </>
                )}

                {isRider && (
                  <>
                    <Link to="/rider/dashboard" className="text-gray-700 hover:text-primary-600">
                      Dashboard
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
                  <button onClick={handleLogout} className="btn-secondary">
                    Logout
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
