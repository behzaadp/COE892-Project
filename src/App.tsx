// src/App.tsx
import React, { useState } from 'react';
import Catalog from './components/Catalog';
import Login from './components/Login';
import Account from './components/Account';
import Navbar from './components/Navbar';
import './App.css';

type Page = 'catalog' | 'login' | 'account';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('catalog');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('account'); // Redirect to account after login
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('catalog'); // Redirect to home after logout
  };

  // State-based router
  const renderPage = () => {
    switch (currentPage) {
      case 'catalog':
        return <Catalog />;
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'account':
        return isLoggedIn ? <Account /> : <Login onLogin={handleLogin} />;
      default:
        return <Catalog />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar 
        currentPage={currentPage} 
        onNavigate={(page) => setCurrentPage(page as Page)} 
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />
      <main className="flex-1">
        {renderPage()}
      </main>
      
      {/* Universal Footer */}
      <footer className="bg-library-dark text-gray-400 py-6 text-center text-sm border-t border-gray-800 mt-auto">
        <p>COE 892 - Automated Public Library System by Behzaad, Aziz, Sarim and Harvik.</p>
      </footer>
    </div>
  );
}

export default App;