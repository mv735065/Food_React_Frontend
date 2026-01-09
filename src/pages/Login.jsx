import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData);
      
      // Debug logging
      console.log('Login result:', result);

      if (result && result.success) {
        // Redirect to return URL or home
        navigate(returnUrl);
      } else {
        const errorMessage = result?.error || 'Login failed. Please check your credentials and try again.';
        console.error('Login failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Login submission error:', error);
      setError(error?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-100 overflow-hidden">
      {/* Large Login Watermark */}
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
        <h1 className="text-[200px] font-bold text-gray-200 opacity-20 select-none">
          Login
        </h1>
      </div>

      {/* Header - Italian Pizza Branding */}
      

      {/* Main Content */}
      <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
        {/* Left Food Decoration */}
        <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-80 h-80">
          <div className="relative w-full h-full">
            <div className="absolute top-0 left-0 w-56 h-56 bg-teal-400 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute top-8 left-8 w-40 h-40 bg-gradient-to-br from-orange-300 to-red-400 rounded-full blur-2xl opacity-60"></div>
            <div className="absolute top-16 left-16 w-32 h-32 bg-green-300 rounded-full blur-xl opacity-50"></div>
            <div className="absolute top-24 left-24 w-20 h-20 bg-yellow-300 rounded-full blur-lg opacity-40"></div>
          </div>
        </div>

        {/* Right Food Decoration */}
        <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80">
          <div className="relative w-full h-full">
            <div className="absolute top-0 right-0 w-56 h-56 bg-teal-400 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute top-8 right-8 w-40 h-40 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full blur-2xl opacity-60"></div>
            <div className="absolute top-16 right-16 w-32 h-32 bg-lime-300 rounded-full blur-xl opacity-50"></div>
            <div className="absolute top-24 right-24 w-20 h-20 bg-red-300 rounded-full blur-lg opacity-40"></div>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="relative z-20 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Login</h2>
              <p className="text-gray-600 text-sm">
                More than <span className="text-fuchsia-600 font-semibold">15,000</span> recipes from around the world!
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter Email Address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>


              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'LOGIN'}
              </button>


            </form>
          </div>
        </div>
      </div>

      {/* Footer */}

    </div>
  );
};

export default Login;
