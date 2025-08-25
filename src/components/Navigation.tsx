import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">Screen Recording</h1>
          </div>
          <div className="flex space-x-1">
            <Link
              to="/home"
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                isActive('/home')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Home
            </Link>
            <Link
              to="/settings"
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                isActive('/settings')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Settings
            </Link>
            <Link
              to="/recordings"
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                isActive('/recordings')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Recordings
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
