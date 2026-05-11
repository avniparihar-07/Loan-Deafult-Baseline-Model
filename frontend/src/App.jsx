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
    const isBankUser = user.type === 'bank';
    const isBankAuth = authRole === 'bank';

    // Route Protection: Ensure user role matches the portal they entered
    if (isBankAuth && !isBankUser) {
      // Borrower tried to access Bank Portal - FORCE LOGOUT
      return (
        <Auth 
          onLogin={handleLogin} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          initialRole="bank" 
          onBack={handleLogout} 
          isLocked={true}
          forcedError="This account belongs to the Borrower Portal. Please use the Borrower Login."
        />
      );
    }
    if (!isBankAuth && isBankUser) {
      // Bank user tried to access Borrower Portal - FORCE LOGOUT
      return (
        <Auth 
          onLogin={handleLogin} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          initialRole="borrower" 
          onBack={handleLogout} 
          isLocked={true}
          forcedError="This account belongs to the Bank Portal. Please use the Bank Officer Login."
        />
      );
    }

    return (
      <div className="shine-root">
        {isBankUser ? (
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
