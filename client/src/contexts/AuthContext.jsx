import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedMustChange = localStorage.getItem('mustChangePassword');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      if (savedMustChange === 'true') {
        setMustChangePassword(true);
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData, mustChangePassword: mustChange } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      if (mustChange) {
        setMustChangePassword(true);
        localStorage.setItem('mustChangePassword', 'true');
      }

      return { success: true, user: userData, mustChangePassword: mustChange };
    } catch (error) {
      const errorData = error.response?.data;
      return {
        success: false,
        error: errorData?.error || 'Login failed'
      };
    }
  };

  const completePasswordChange = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('mustChangePassword');
    setUser(userData);
    setMustChangePassword(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('mustChangePassword');
    setUser(null);
    setMustChangePassword(false);
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading, mustChangePassword, completePasswordChange }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
