import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RestaurantList from './pages/RestaurantList';
import RestaurantMenu from './pages/RestaurantMenu';

// Customer Pages
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderStatus from './pages/OrderStatus';
import UserOrders from './pages/UserOrders';

// Restaurant Pages
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import ManageMenu from './pages/restaurant/ManageMenu';
import RestaurantOrders from './pages/restaurant/RestaurantOrders';

// Rider Pages
import RiderDashboard from './pages/rider/RiderDashboard';
import RiderOrders from './pages/rider/RiderOrders';

// Admin Pages
import ManageUsers from './pages/admin/ManageUsers';
import ManageRestaurants from './pages/admin/ManageRestaurants';
import ManageOrders from './pages/admin/ManageOrders';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/restaurants" element={<RestaurantList />} />
                  <Route path="/restaurants/:id" element={<RestaurantMenu />} />

                  {/* Customer Routes */}
                  <Route
                    path="/cart"
                    element={
                      <ProtectedRoute>
                        <Cart />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <UserOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:id"
                    element={
                      <ProtectedRoute>
                        <OrderStatus />
                      </ProtectedRoute>
                    }
                  />

                  {/* Restaurant Routes */}
                  <Route
                    path="/restaurant/dashboard"
                    element={
                      <ProtectedRoute requiredRole="restaurant">
                        <RestaurantDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurant/menu"
                    element={
                      <ProtectedRoute requiredRole="restaurant">
                        <ManageMenu />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurant/orders"
                    element={
                      <ProtectedRoute requiredRole="restaurant">
                        <RestaurantOrders />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rider Routes */}
                  <Route
                    path="/rider/dashboard"
                    element={
                      <ProtectedRoute requiredRole="rider">
                        <RiderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider/orders"
                    element={
                      <ProtectedRoute requiredRole="rider">
                        <RiderOrders />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <ManageUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/restaurants"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <ManageRestaurants />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <ManageOrders />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
