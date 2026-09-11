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
          setUser(response.data.user);
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
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/logout', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (e) {
      // Ignore errors on logout
    } finally {
      clearAllStorage();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, clearAllStorage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
