import React, { createContext, useState, useContext, useEffect } from 'react';
import { formatErrorMessage } from '../utils/errorHandling';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use empty string for relative URLs (setupProxy.js will handle routing to backend)
  const API_URL = '';

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const loginUrl = `${API_URL}/auth/login`;
    console.log('🔐 Attempting login to:', loginUrl);
    
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      console.log('📡 Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (!response.ok) {
        return { 
          success: false, 
          error: formatErrorMessage(data.detail, 'Login failed')
        };
      }
      
      const { access_token, user: userData } = data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData?.gift_credits_awarded || userData?.gift_leads_awarded) {
        localStorage.setItem('fm_onboarding_reward', JSON.stringify(userData));
      }
      setUser(userData);

      console.log('✅ Login successful! User:', userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('API URL was:', loginUrl);
      return { 
        success: false, 
        error: `Cannot connect to server. Please ensure backend is running at ${API_URL}` 
      };
    }
  };

  const signup = async (email, password, companyName, phone) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          company_name: companyName,
          phone,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { 
          success: false, 
          error: formatErrorMessage(data.detail, 'Signup failed')
        };
      }
      
      const { access_token, user: userData } = data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.removeItem('fm_onboarding_welcome_shown');
      if (userData?.gift_credits_awarded || userData?.gift_leads_awarded) {
        localStorage.setItem('fm_onboarding_reward', JSON.stringify(userData));
      }
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        error: error.message || 'Signup failed' 
      };
    }
  };

  const loginWithGoogle = async (idToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: formatErrorMessage(data.detail, 'Google login failed') };
      }
      const { access_token, user: userData } = data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData?.gift_credits_awarded || userData?.gift_leads_awarded) {
        localStorage.setItem('fm_onboarding_reward', JSON.stringify(userData));
      }
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message || 'Google login failed' };
    }
  };

  const loginWithMicrosoft = async (idToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/microsoft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: formatErrorMessage(data.detail, 'Microsoft login failed') };
      }
      const { access_token, user: userData } = data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData?.gift_credits_awarded || userData?.gift_leads_awarded) {
        localStorage.setItem('fm_onboarding_reward', JSON.stringify(userData));
      }
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message || 'Microsoft login failed' };
    }
  };

  const loginWithApple = async (idToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: formatErrorMessage(data.detail, 'Apple login failed') };
      }
      const { access_token, user: userData } = data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData?.gift_credits_awarded || userData?.gift_leads_awarded) {
        localStorage.setItem('fm_onboarding_reward', JSON.stringify(userData));
      }
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message || 'Apple login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithApple,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
