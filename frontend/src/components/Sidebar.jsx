import React from 'react';

export default function Sidebar({ role, activePage, setPage, user, onLogout }) {
  const bankMenu = [
    { id: 'bd-overview',     label: 'Dashboard' },
    { id: 'bd-portfolio',    label: 'Customers' },
    { id: 'bd-risk',         label: 'Risk Review' },
    { id: 'bd-underwriting', label: 'Applications' },
    { id: 'bd-reports',      label: 'Reports' },
    { id: 'bd-behaviour',    label: 'Customer Activity' }
  ];

  const borrowerMenu = [
    { id: 'bpg-simulator', label: 'Check Eligibility' },
    { id: 'bpg-apply', label: 'Apply Loan' },
    { id: 'bpg-history', label: 'My Applications' },
    { id: 'bpg-stocks', label: 'Money Insights' },
    { id: 'bpg-tips', label: 'Smart Tips' }
  ];

  const menu = role === 'bank' ? bankMenu : borrowerMenu;

  return (
    <header className="sidebar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="sb-header">
        <div className="lp-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="logo-g" style={{ background: 'var(--gold)', color: '#fff', borderRadius: '4px', width: '32px', height: '32px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>G</span>
          <span className="logo-text" style={{ color: '#fff', fontSize: '20px', letterSpacing: '-0.02em', fontWeight: 800 }}>GroundZero</span>
        </div>
      </div>

      <nav className="sb-nav" style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
        {menu.map(item => (
          <div 
            key={item.id} 
            className={`sb-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
            style={{ 
              cursor: 'pointer', 
              color: activePage === item.id ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
              fontWeight: 700,
              fontSize: '13px',
              padding: '24px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease',
              borderBottom: activePage === item.id ? '2px solid var(--gold)' : '2px solid transparent'
            }}
          >
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sb-footer" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '20px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
            {user?.first?.charAt(0) || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{user?.first} {user?.last}</span>
            <span style={{ color: 'var(--gold)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {role === 'bank' ? (user?.officer_role || 'Bank Officer') : 'Portal Access'}
            </span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
