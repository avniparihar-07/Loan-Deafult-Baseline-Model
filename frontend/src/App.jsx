import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import BankDashboard from './pages/BankDashboard';
import BorrowerPortal from './pages/BorrowerPortal';
import Auth from './components/Auth';
import './styles/index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [view, setView] = useState('landing'); // 'landing' | 'auth'
  const [authRole, setAuthRole] = useState('borrower');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogin = (userData) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('landing');
  };

  const navigateToAuth = (role) => {
    setAuthRole(role);
    setView('auth');
  };

  if (user) {
    return (
      <div className="shine-root">
        {user.type === 'bank' ? (
          <BankDashboard user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
        ) : (
          <BorrowerPortal user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
        )}
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <Auth 
        onLogin={handleLogin} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        initialRole={authRole} 
        onBack={() => setView('landing')}
        isLocked={true}
      />
    );
  }

  return (
    <LandingPage 
      onLogin={handleLogin} 
      theme={theme} 
      toggleTheme={toggleTheme} 
      onEnterPortal={navigateToAuth}
    />
  );
}
