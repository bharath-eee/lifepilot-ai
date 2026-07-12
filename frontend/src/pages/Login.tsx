import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const Login: React.FC = () => {
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/login`;
  };

  return (
    <div className="min-h-screen bg-bgDarker flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Background glow elements */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-neonBlue/5 rounded-full blur-[140px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-neonPurple/5 rounded-full blur-[140px] animate-pulse-slow" />

      {/* Main Login Frame */}
      <div className="w-full max-w-md p-8 md:p-10 rounded-2xl glass-panel relative border border-glassBorder shadow-glass flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-neonBlue to-neonPurple flex items-center justify-center text-white mb-6 shadow-neonBlue/10">
          <Sparkles className="w-6 h-6" />
        </div>

        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">LifePilot AI</h2>
        <p className="text-slate-600 text-sm text-center mb-8 max-w-[280px]">
          Your autonomous email, calendar, and task scheduling co-pilot.
        </p>

        {/* Action Button */}
        <div className="w-full space-y-4">
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-3 py-3.5 px-5 bg-white border border-glassBorder rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-neonBlue/30 shadow-sm transition-all font-medium group cursor-pointer"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" stroke="none" />
            </svg>
            <span>Continue with Google</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          By signing in, you connect your workspace credentials securely.
        </div>
      </div>
    </div>
  );
};
