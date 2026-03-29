// src/App.tsx
import { useState } from 'react';
import Catalog from './components/Catalog';
import Login from './components/Login';
import Account from './components/Account';
import Navbar from './components/Navbar';
import Signup from './components/Signup';
import './App.css';

type Page = 'catalog' | 'login' | 'account' | 'signup';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    return sessionStorage.getItem('userId') ? 'catalog' : 'catalog';
  });
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    return sessionStorage.getItem('userId');
  });

  const handleLogin = (userId: string) => {
    sessionStorage.setItem('userId', userId);
    setActiveUserId(userId);
    setCurrentPage('account');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userId');
    setActiveUserId(null);
    setCurrentPage('catalog');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'catalog':
        return (
          <Catalog
            activeUserId={activeUserId}
            onRequireLogin={() => setCurrentPage('login')}
          />
        );
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'signup':
        return (
          <Signup
            onSignup={handleLogin}
            onNavigateLogin={() => setCurrentPage('login')}
          />
        );
      case 'account':
        return activeUserId ? (
          <Account userId={activeUserId} />
        ) : (
          <Login onLogin={handleLogin} />
        );
      default:
        return (
          <Catalog
            activeUserId={activeUserId}
            onRequireLogin={() => setCurrentPage('login')}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page as Page)}
        isLoggedIn={!!activeUserId}
        onLogout={handleLogout}
        activeUserId={activeUserId}
      />
      <main className="flex-1">
        {renderPage()}
      </main>

      <footer className="bg-library-dark text-gray-400 py-6 text-center text-sm border-t border-gray-800 mt-auto">
        <p>COE 892 - Automated Public Library System by Behzaad, Aziz, Sarim and Harvik.</p>
      </footer>
    </div>
  );
}

export default App;