import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const LoginSuccess: React.FC = () => {
  const { login, token: authToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasProcessed = useRef(false);

  // Step 1: Parse query params and call login() once
  useEffect(() => {
    if (hasProcessed.current) return;
    
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        hasProcessed.current = true;
        login(token, user);
      } catch (err) {
        console.error('Failed to parse user details from login callback', err);
        navigate('/login', { replace: true });
      }
    } else {
      console.error('Missing token or user query params from login callback');
      navigate('/login', { replace: true });
    }
  }, [searchParams, login, navigate]);

  // Step 2: Navigate to dashboard AFTER auth state has updated
  useEffect(() => {
    if (hasProcessed.current && authToken) {
      navigate('/', { replace: true });
    }
  }, [authToken, navigate]);

  return (
    <div className="min-h-screen bg-[#05070C] flex flex-col justify-center items-center p-6 text-white font-sans">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-10 h-10 text-neonBlue animate-spin" />
        <p className="text-slate-400 font-mono text-sm animate-pulse">Authenticating your Google session...</p>
      </div>
    </div>
  );
};
