// src/components/Navbar.tsx
import React from 'react';
import { Book, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  activeUserId: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, isLoggedIn, onLogout, activeUserId }) => {
  return (
    <nav className="bg-library-dark text-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => onNavigate('catalog')}
          >
            <Book className="h-7 w-7 text-library-accent group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold font-serif tracking-wide">Public Library</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <button
              onClick={() => onNavigate('catalog')}
              className={`hover:text-library-accent transition-colors ${currentPage === 'catalog' ? 'text-library-accent border-b-2 border-library-accent' : ''}`}
            >
              Catalog
            </button>

            {isLoggedIn ? (
              <>
                <button
                  onClick={() => onNavigate('account')}
                  className={`flex items-center gap-2 hover:text-library-accent transition-colors ${currentPage === 'account' ? 'text-library-accent border-b-2 border-library-accent' : ''}`}
                >
                  <User className="h-4 w-4" />
                  My Account
                </button>

                {/* Notification Bell — only shown when logged in */}
                {activeUserId && (
                  <NotificationBell userId={activeUserId} />
                )}

                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 hover:text-red-400 transition-colors ml-4 pl-4 border-l border-gray-600"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('login')}
                  className={`flex items-center gap-2 hover:text-library-accent px-3 py-2 transition-colors ${currentPage === 'login' ? 'text-library-accent' : ''}`}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className={`flex items-center gap-2 bg-library-primary hover:bg-library-secondary px-4 py-2 rounded-lg transition-colors shadow-sm ${currentPage === 'signup' ? 'ring-2 ring-library-accent' : ''}`}
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
