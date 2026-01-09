import { createContext, useContext, useState, useRef } from 'react';

const ApiCacheContext = createContext(null);

export const useApiCache = () => {
  const context = useContext(ApiCacheContext);
  if (!context) {
    throw new Error('useApiCache must be used within ApiCacheProvider');
  }
  return context;
};

export const ApiCacheProvider = ({ children }) => {
  // Use ref to persist cache across re-renders
  const cacheRef = useRef(new Map());
  const [, forceUpdate] = useState(0);

  // Cache TTL (Time To Live) in milliseconds - 5 minutes default
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = (endpoint, params = {}) => {
    const paramString = JSON.stringify(params);
    return `${endpoint}${paramString ? `_${paramString}` : ''}`;
  };

  const get = (endpoint, params = {}) => {
    const key = getCacheKey(endpoint, params);
    const cached = cacheRef.current.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    // Return cached data if still fresh
    if (age < CACHE_TTL) {
      return cached.data;
    }

    // Cache expired, remove it
    cacheRef.current.delete(key);
    return null;
  };

  const set = (endpoint, params = {}, data) => {
    const key = getCacheKey(endpoint, params);
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
    });
    forceUpdate((prev) => prev + 1); // Trigger re-render if needed
  };

  const invalidate = (endpoint, params = {}) => {
    const key = getCacheKey(endpoint, params);
    cacheRef.current.delete(key);
    forceUpdate((prev) => prev + 1);
  };

  const invalidateAll = () => {
    cacheRef.current.clear();
    forceUpdate((prev) => prev + 1);
  };

  const clear = () => {
    cacheRef.current.clear();
    forceUpdate((prev) => prev + 1);
  };

  const value = {
    get,
    set,
    invalidate,
    invalidateAll,
    clear,
  };

  return <ApiCacheContext.Provider value={value}>{children}</ApiCacheContext.Provider>;
};
