import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Mail, 
  Receipt, 
  CheckSquare, 
  Zap, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigation: SidebarItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
    { name: 'Important Mail', path: '/mail', icon: Mail },
    { name: 'Bill Manager', path: '/bills', icon: Receipt },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Automations', path: '/automations', icon: Zap },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-bgDark text-slate-800 overflow-hidden font-sans">
      {/* Mobile Navigation Drawer backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-64 glass-panel border-r border-glassBorder 
        transition-transform duration-300 md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand logo container */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-glassBorder">
          <Link to="/" className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-neonBlue" />
            <span className="text-xl font-bold tracking-wider text-slate-900">
              LifePilot AI
            </span>
          </Link>
          <button className="md:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-neonBlue text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
                `}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Profile drawer footer */}
        <div className="p-4 border-t border-glassBorder bg-slate-50">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full ring-1 ring-neonBlue/30" />
                ) : (
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-neonPurple/10 text-neonPurple font-bold">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="truncate">
                  <p className="text-sm font-medium text-slate-950 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={logout} 
                className="p-2 text-slate-500 rounded-lg hover:text-critical hover:bg-critical/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="flex items-center justify-center w-full py-2.5 px-4 rounded-xl font-semibold bg-neonBlue text-white hover:bg-neonBlue/95 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Main panel container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="flex items-center justify-between h-16 px-6 glass-panel border-b border-glassBorder md:justify-end">
          <button 
            className="p-2 -ml-2 text-slate-500 rounded-lg hover:text-slate-900 md:hidden"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono text-slate-600 bg-slate-100 py-1 px-3 rounded-full border border-glassBorder flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse"></span>
              <span>Agent Active</span>
            </span>
          </div>
        </header>

        {/* Content canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-bgDark">
          {children}
        </main>
      </div>
    </div>
  );
};
