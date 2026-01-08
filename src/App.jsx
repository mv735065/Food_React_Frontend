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
import RestaurantOwnerDashboard from './pages/restaurant/RestaurantOwnerDashboard';
import ManageMenu from './pages/restaurant/ManageMenu';
import RestaurantOrders from './pages/restaurant/RestaurantOrders';
import MyRestaurants from './pages/restaurant/MyRestaurants';
import CreateRestaurant from './pages/restaurant/CreateRestaurant';

// Rider Pages
import RiderDashboard from './pages/rider/RiderDashboard';
import RiderOrders from './pages/rider/RiderOrders';
import AvailableOrders from './pages/rider/AvailableOrders';

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
                      <ProtectedRoute requiredRole="RESTAURANT">
                        <RestaurantOwnerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurant/my-restaurants"
                    element={
                      <ProtectedRoute requiredRole="RESTAURANT">
                        <MyRestaurants />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurant/"
                    element={
                      <ProtectedRoute requiredRole="RESTAURANT">
                        <CreateRestaurant />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurants/:id/dashboard"
                    element={
                      <ProtectedRoute requiredRole="RESTAURANT">
                        <RestaurantDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurants/:id/menu"
                    element={
                      <ProtectedRoute requiredRole="RESTAURANT">
                        <ManageMenu />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurants/:id/orders"
                    element={
                      <ProtectedRoute requiredRole="RESTAURANT">
                        <RestaurantOrders />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rider Routes */}
                  <Route
                    path="/rider/dashboard"
                    element={
                      <ProtectedRoute requiredRole="RIDER">
                        <RiderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider/available-orders"
                    element={
                      <ProtectedRoute requiredRole="RIDER">
                        <AvailableOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider/orders"
                    element={
                      <ProtectedRoute requiredRole="RIDER">
                        <RiderOrders />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <ManageUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/restaurants"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <ManageRestaurants />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
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
