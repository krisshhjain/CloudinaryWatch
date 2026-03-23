import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AdminProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        setIsValid(false);
        setLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const res = await axios.get(`${API_URL}/admin/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.admin) {
          setIsValid(true);
        } else {
          localStorage.removeItem('adminToken');
          setIsValid(false);
        }
      } catch (error) {
        console.error('Admin token validation failed:', error);
        localStorage.removeItem('adminToken');
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/krishistheadmin" replace />;
  }

  return children;
}
