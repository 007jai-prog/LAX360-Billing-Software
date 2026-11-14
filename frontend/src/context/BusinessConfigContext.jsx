import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/client';

const BusinessConfigContext = createContext(null);

export const BusinessConfigProvider = ({ children }) => {
  const { tenant } = useAuth();
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load all master categories (for landing/registration)
  useEffect(() => {
    const fetchMasterCategories = async () => {
      try {
        const res = await api.get('/business-categories');
        setCategories(res.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchMasterCategories();
  }, []);

  // Whenever tenant or business_category changes, resolve dynamic configuration
  useEffect(() => {
    const fetchDynamicConfig = async () => {
      const categoryId = tenant?.business_category || 'grocery';
      setLoadingConfig(true);
      try {
        const res = await api.get(`/business-categories/${categoryId}/config`);
        setConfig(res.data);
      } catch (err) {
        console.error('Error resolving category config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchDynamicConfig();
  }, [tenant?.business_category]);

  const hasFeature = (featureName) => {
    return !!config?.features?.[featureName];
  };

  return (
    <BusinessConfigContext.Provider
      value={{
        config,
        categories,
        loadingConfig,
        currentCategory: tenant?.business_category || 'grocery',
        hasFeature,
        sidebarNavigation: config?.sidebar_navigation || [],
        productFields: config?.product_fields || [],
        posLayout: config?.pos_layout || 'rapid_scan',
        themeAccent: config?.theme_accent || 'indigo'
      }}
    >
      {children}
    </BusinessConfigContext.Provider>
  );
};

export const useBusinessConfig = () => {
  const context = useContext(BusinessConfigContext);
  if (!context) {
    throw new Error('useBusinessConfig must be used within a BusinessConfigProvider');
  }
  return context;
};
