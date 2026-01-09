import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Normalize roles to uppercase for comparison (backend uses uppercase: USER, RESTAURANT, RIDER, ADMIN)
  const userRole = user?.role?.toUpperCase();
  const normalizedRequiredRole = requiredRole?.toUpperCase();
  
  // Admin can access all routes
  if (requiredRole && userRole !== normalizedRequiredRole && userRole !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
