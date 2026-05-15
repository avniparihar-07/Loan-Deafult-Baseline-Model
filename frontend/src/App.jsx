import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import BankDashboard from './pages/BankDashboard';
import BorrowerPortal from './pages/BorrowerPortal';
import Auth from './components/Auth';
import './styles/index.css';

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('gz_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gz_theme') || 'light';
  });
  const [view, setView] = useState(() => {
    const savedUser = localStorage.getItem('gz_user');
    return savedUser ? 'dashboard' : 'landing';
  });
  const [authRole, setAuthRole] = useState(() => {
    return localStorage.getItem('gz_authRole') || 'borrower';
  });
  const [sessionExpired, setSessionExpired] = useState(false);

  // Global Session Timeout: 15 minutes
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      if (user) {
        timeout = setTimeout(() => {
          handleLogout();
          setSessionExpired(true);
        }, 15 * 60 * 1000); // 15 Minutes
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeout);
    };
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gz_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleRoleChange = (role) => {
    setAuthRole(role);
    localStorage.setItem('gz_authRole', role);
  };

  const handleLogin = (userData) => {
    localStorage.setItem('gz_user', JSON.stringify(userData));
    localStorage.setItem('gz_authRole', authRole);
    setUser(userData);
    setView('dashboard');
    setSessionExpired(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('gz_user');
    localStorage.removeItem('gz_authRole');
    setUser(null);
    setView('landing');
  };

  const navigateToAuth = (role) => {
    handleRoleChange(role);
    setView('auth');
    setSessionExpired(false);
  };

  if (user) {
    const isBankUser = user.type === 'bank';
    const isBankAuth = authRole === 'bank';

    if (!isBankAuth && isBankUser) {
      // Bank user tried to access Borrower Portal - FORCE LOGOUT
      return (
        <Auth 
          onLogin={handleLogin} 
          onRoleChange={setAuthRole}
          theme={theme} 
          toggleTheme={toggleTheme} 
          initialRole="borrower" 
          onBack={handleLogout} 
          isLocked={true}
          forcedError="This account is registered for Institutional Access. Please use the Bank Analyst login."
        />
      );
    }

    if (isBankAuth && !isBankUser) {
      // Borrower tried to access Bank Portal
      return (
        <Auth 
          onLogin={handleLogin} 
          onRoleChange={setAuthRole}
          theme={theme} 
          toggleTheme={toggleTheme} 
          initialRole="bank" 
          onBack={handleLogout} 
          isLocked={true}
          forcedError="This account is registered as a Borrower. Please use the Borrower Access tab."
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
        onRoleChange={handleRoleChange}
        theme={theme} 
        toggleTheme={toggleTheme} 
        initialRole={authRole} 
        onBack={() => setView('landing')}
        isLocked={true}
        forcedError={sessionExpired ? "Session expired for security reasons. Please login again." : ""}
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
