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
  const [currentPage, setCurrentPage] = useState<Page>('catalog');
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const handleLogin = (userId: string) => {
    setActiveUserId(userId);
    setCurrentPage('account'); // Redirect to account after login
  };

  const handleLogout = () => {
    setActiveUserId(null);
    setCurrentPage('catalog'); // Redirect to home after logout
  };

  // State-based router
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