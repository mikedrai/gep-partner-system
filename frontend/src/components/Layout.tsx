import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';

const adminNavigation = [
  { name: 'Dashboard', href: '/', current: false },
  { name: 'Customer Requests', href: '/requests', current: false },
  { name: 'Partners', href: '/partners', current: false },
  { name: 'Assignments', href: '/assignments', current: false },
  { name: 'Analytics', href: '/analytics', current: false },
  { name: 'Traceability', href: '/traceability', current: false },
];

const partnerNavigation = [
  { name: 'Calendar', href: '#', current: false, tab: 'calendar' },
  { name: 'Pending Requests', href: '#', current: false, tab: 'pending' },
  { name: 'Change Requests', href: '#', current: false, tab: 'changes' },
  { name: 'Reports', href: '#', current: false, tab: 'reports' },
  { name: 'Profile', href: '#', current: false, tab: 'profile' },
];

interface LayoutProps {
  children: React.ReactNode;
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

export default function Layout({ children, onTabChange, activeTab }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Choose navigation based on user role
  const navigation = user?.role === 'partner' ? partnerNavigation : adminNavigation;

  // Update current navigation item based on current path or active tab
  const updatedNavigation = navigation.map((item) => ({
    ...item,
    current: user?.role === 'partner' 
      ? activeTab === item.tab
      : location.pathname === item.href || 
        (item.href !== '/' && location.pathname.startsWith(item.href)),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  GEP Assignment System
                </Link>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                {updatedNavigation.map((item) => (
                  user?.role === 'partner' ? (
                    <button
                      key={item.name}
                      onClick={() => onTabChange?.(item.tab!)}
                      className={
                        item.current
                          ? 'border-blue-500 text-gray-900 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                      }
                      aria-current={item.current ? 'page' : undefined}
                    >
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={
                        item.current
                          ? 'border-blue-500 text-gray-900 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                      }
                      aria-current={item.current ? 'page' : undefined}
                    >
                      {item.name}
                    </Link>
                  )
                ))}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}