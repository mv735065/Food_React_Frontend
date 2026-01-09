import { useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurantAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BackButton from '../components/BackButton';
import { useCachedApi } from '../hooks/useCachedApi';

const RestaurantList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use cached API call
  const { data: restaurantsData, loading, error: apiError } = useCachedApi(
    () => restaurantAPI.getAll(),
    'restaurants/all',
    {},
    []
  );

  // Extract restaurants from response
  const restaurants = restaurantsData?.restaurants || restaurantsData || [];
  const error = apiError ? 'Failed to load restaurants. Please try again.' : '';

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.cuisine?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner size="lg" className="min-h-[400px]" />
      </div>
    );
  }

  // Get cuisine color
  const getCuisineColor = (cuisine) => {
    const cuisineColors = {
      'italian': 'bg-red-100 text-red-800 border-red-200',
      'chinese': 'bg-orange-100 text-orange-800 border-orange-200',
      'mexican': 'bg-green-100 text-green-800 border-green-200',
      'indian': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'japanese': 'bg-pink-100 text-pink-800 border-pink-200',
      'thai': 'bg-purple-100 text-purple-800 border-purple-200',
      'american': 'bg-blue-100 text-blue-800 border-blue-200',
      'mediterranean': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    };
    const normalizedCuisine = (cuisine || '').toLowerCase();
    return cuisineColors[normalizedCuisine] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white py-12 mb-8 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
              🍽️ Discover Amazing Restaurants
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Order from your favorite local restaurants
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search restaurants, cuisine, or dishes..."
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/50 shadow-xl transition-all duration-300 text-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-md">
            {error}
          </div>
        )}

        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-xl font-medium">No restaurants found.</p>
            <p className="text-gray-400 mt-2">Try adjusting your search terms</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'Restaurant' : 'Restaurants'} Found
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => {
                const restaurantId = restaurant.id || restaurant._id;
                const imageUrl = restaurant.imageUrl || restaurant.image || `https://placehold.co/600x400?text=${encodeURIComponent(restaurant.name || 'Restaurant')}`;
                const cuisine = restaurant.cuisineType || restaurant.cuisine || 'Cuisine';
                const cuisineColor = getCuisineColor(cuisine);

                return (
                  <Link
                    key={restaurantId}
                    to={`/restaurants/${restaurantId}`}
                    className="group block transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                  >
                    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
                      {/* Image Section with Overlay */}
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.target.src = `https://placehold.co/600x400?text=${encodeURIComponent(restaurant.name || 'Restaurant')}`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Cuisine Badge */}
                        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold border ${cuisineColor} backdrop-blur-sm shadow-lg`}>
                          {cuisine}
                        </div>

                        {/* Hover Overlay Text */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-white font-semibold text-sm">Click to view menu →</p>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                          {restaurant.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">
                          {restaurant.description || `Delicious ${cuisine} cuisine`}
                        </p>
                        
                        {/* Rating and Location */}
                        <div className="space-y-2 mt-auto">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-gray-700 font-medium">
                                {restaurant.rating || '4.5'}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-500 text-xs">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate max-w-[120px]">{restaurant.address || 'Location'}</span>
                            </div>
                          </div>
                          
                          {/* View Menu Button */}
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between text-primary-600 font-semibold text-sm">
                              <span>View Menu</span>
                              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestaurantList;
