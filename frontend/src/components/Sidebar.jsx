import React from 'react';

export default function Sidebar({ user, activePage, setPage, onLogout, type, toggleTheme }) {
  const bankPages = [
    { id: 'pg-overview', icon: '📊', label: 'Overview' },
    { id: 'pg-assess', icon: '⚡', label: 'Risk Assessment' },
    { id: 'pg-history', icon: '📋', label: 'Loan History' },
    { id: 'pg-insights', icon: '📈', label: 'Business Insights', section: 'Intelligence' },
    { id: 'pg-behaviour', icon: '🧠', label: 'Behaviour Profile', section: 'Intelligence' },
    { id: 'pg-invest', icon: '💹', label: 'Investments', section: 'Intelligence' },
    { id: 'pg-suggest', icon: '💡', label: 'Recommendations', section: 'Intelligence' }
  ];

  const borPages = [
    { id: 'bpg-status', icon: '📄', label: 'My Application' },
    { id: 'bpg-apply', icon: '✏️', label: 'Submit Details' },
    { id: 'bpg-tips', icon: '💡', label: 'Improve Score' },
    { id: 'bpg-stocks', icon: '📈', label: 'Stock Investments' },
  ];

  const pages = type === 'bank' ? bankPages : borPages;
  
  const analyticsPages = pages.filter(p => !p.section);
  const intelPages = pages.filter(p => p.section === 'Intelligence');

  const getGradient = (name) => {
    let h = 0; for(let i=0; i<name.length; i++) h=(h*31+name.charCodeAt(i))%5;
    return `av-g${h}`;
  };

  return (
    <aside className="sidebar">
      <div className="sb-top">
        <div className="sb-brand">
          <div className="sb-mark">G</div>
          <div>
            <div className="sb-nm">Ground<em>Zero</em></div>
            <div className={`sb-bdg ${type === 'bank' ? 'sbb-bank' : 'sbb-bor'}`}>
              {type === 'bank' ? 'Bank Analyst' : 'Borrower'}
            </div>
          </div>
        </div>
        <button className="theme-btn" onClick={toggleTheme} style={{width:'40px',height:'22px'}} title="Toggle theme">
          <div className="theme-btn-track" style={{borderRadius:'50px'}}>
            <div className="theme-btn-stars" />
            <div className="theme-btn-thumb" style={{width:'16px',height:'16px',fontSize:'9px',top:'3px',left:'3px'}}>🌙</div>
          </div>
        </button>
      </div>

      <nav className="sb-nav">
        <div className="sb-sec">
          <div className="sb-sec-lbl">{type === 'bank' ? 'Analytics' : 'My Portal'}</div>
          {analyticsPages.map(p => (
            <div 
              key={p.id} 
              className={`nav-item ${activePage === p.id ? 'on' : ''}`}
              onClick={() => setPage(p.id)}
            >
              <span className="ni">{p.icon}</span> {p.label}
            </div>
          ))}
        </div>
        
        {intelPages.length > 0 && (
          <div className="sb-sec">
            <div className="sb-sec-lbl">Intelligence</div>
            {intelPages.map(p => (
              <div 
                key={p.id} 
                className={`nav-item ${activePage === p.id ? 'on' : ''}`}
                onClick={() => setPage(p.id)}
              >
                <span className="ni">{p.icon}</span> {p.label}
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="sb-user">
        <div className={`sb-av ${getGradient((user.first||'')+(user.last||''))}`}>
          {user.first?.[0]}{user.last?.[0]}
        </div>
        <div className="sb-ui">
          <div className="sb-un">{user.first} {user.last}</div>
          <div className="sb-ur">{user.type === 'bank' ? 'Credit Analyst' : 'Borrower'}</div>
        </div>
        <button className="sb-logout" onClick={onLogout}>⏻</button>
      </div>
    </aside>
  );
}
