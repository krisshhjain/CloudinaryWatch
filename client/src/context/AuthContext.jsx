import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';
const API = axios.create({ baseURL: `${API_BASE}/api` });

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('cw_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cw_token');
      localStorage.removeItem('cw_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export { API };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cw_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const { data } = await API.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      localStorage.removeItem('cw_token');
      localStorage.removeItem('cw_user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Step 1: Submit credentials — returns { requiresOtp, email }
  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    return data; // { message, email, requiresOtp: true }
  };

  // Step 2: Verify login OTP — returns { token, user }
  const verifyLoginOtp = async (email, otp) => {
    const { data } = await API.post('/auth/verify-login', { email, otp });
    localStorage.setItem('cw_token', data.token);
    localStorage.setItem('cw_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  // Step 1: Submit signup — sends OTP
  const signup = async (name, email, password) => {
    const { data } = await API.post('/auth/signup', { name, email, password });
    return data; // { message, email }
  };

  // Step 2: Verify signup OTP — creates account
  const verifySignupOtp = async (email, otp) => {
    const { data } = await API.post('/auth/verify-signup', { email, otp });
    localStorage.setItem('cw_token', data.token);
    localStorage.setItem('cw_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  // Resend OTP
  const resendOtp = async (email, purpose) => {
    const { data } = await API.post('/auth/resend-otp', { email, purpose });
    return data;
  };

  const loginWithGoogle = () => {
    const backendUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const handleOAuthCallback = (tokenParam) => {
    localStorage.setItem('cw_token', tokenParam);
    setToken(tokenParam);
  };

  const logout = () => {
    localStorage.removeItem('cw_token');
    localStorage.removeItem('cw_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    verifyLoginOtp,
    signup,
    verifySignupOtp,
    resendOtp,
    loginWithGoogle,
    handleOAuthCallback,
    logout,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
