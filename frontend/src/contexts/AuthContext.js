// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(JSON.parse(storedUser))

        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email });

      const response = await api.post('/auth/login', {
        email,
        password
      });

      console.log('Login response:', response.data);

      const { user, token } = response.data;

      if (!token || !user) {
        throw new Error('Invalid login response - missing token or user');
      }

      localStorage.setItem('token', token);


      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      localStorage.setItem('user', JSON.stringify(user));   
      setUser(user);

      // Log the current state after setting
    console.log('Auth state after login:', {
      tokenExists: !!localStorage.getItem('token'),
      headerExists: !!api.defaults.headers.common['Authorization']
    });
      return { user, token };

    } catch (error) {
      console.error('Login error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }

      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (username, email, password, department) => {
    try {
      console.log('Attempting registration:', { email, username });

      const response = await api.post('/auth/register', {
        username,
        email,
        password,
        department
      });

      console.log('Registration response:', response.data);

      const { user, token } = response.data;
      
      if (!user || !token) {
        console.error('Invalid server response:', response.data);
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      setUser(user);
      
      return user;

    } catch (error) {
      console.error('Registration error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 409) {
        throw new Error('User already exists');
      }

      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      
      // Clear authorization header
      delete api.defaults.headers.common['Authorization'];
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register, 
      loading,
      refreshUser,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;