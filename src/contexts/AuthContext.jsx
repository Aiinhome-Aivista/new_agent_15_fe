import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { clearAllStorage } from '../utils/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up auth headers directly for API requests in this file if needed
  // Alternatively, other services use the apiClient from api.js

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const responseData = response.data.data || response.data;
          setUser(responseData.user);
        } catch (error) {
          console.error('Failed to validate session:', error);
          clearAllStorage();
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      clearAllStorage();
      
      // Handle standard response wrapper
      const responseData = response.data.data || response.data;
      
      localStorage.setItem('token', responseData.token);
      setUser(responseData.user);
      return { success: true, user: responseData.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    const token = localStorage.getItem('token');
    // Immediate optimistic client-side cleanup for instantaneous 0ms logout response
    clearAllStorage();
    setUser(null);

    // Asynchronous background notification (fire-and-forget, non-blocking)
    if (token) {
      axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 2000
      }).catch(() => {
        // Ignore background logout errors
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, clearAllStorage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
