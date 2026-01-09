import { useState, useEffect, useRef } from 'react';
import { useApiCache } from '../contexts/ApiCacheContext';

/**
 * Custom hook for cached API calls
 * @param {Function} apiCall - The API function to call
 * @param {string} cacheKey - Unique cache key for this API call
 * @param {Object} params - Parameters for the API call
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @param {boolean} forceRefresh - Force refresh even if cache exists
 */
export const useCachedApi = (apiCall, cacheKey, params = {}, dependencies = [], forceRefresh = false) => {
  const cache = useApiCache();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          const cachedData = cache.get(cacheKey, params);
          if (cachedData) {
            if (mountedRef.current && !isCancelled) {
              setData(cachedData);
              setLoading(false);
            }
            return;
          }
        }

        // Fetch from API
        const response = await apiCall(params);
        
        // Extract data from response (handle nested structures)
        let responseData = response?.data?.data || response?.data || response;
        
        // Cache the response
        cache.set(cacheKey, params, responseData);

        if (mountedRef.current && !isCancelled) {
          setData(responseData);
          setLoading(false);
        }
      } catch (err) {
        if (mountedRef.current && !isCancelled) {
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, forceRefresh, ...dependencies]);

  const refetch = () => {
    cache.invalidate(cacheKey, params);
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    setData(null);
  };

  return { data, loading, error, refetch };
};
