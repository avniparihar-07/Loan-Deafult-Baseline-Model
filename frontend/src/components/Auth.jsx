import React, { useState } from 'react';

export default function Auth({ onLogin, theme, toggleTheme }) {
  const [role, setRole] = useState('bank');
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="screen active">
      <div className="auth-bg">
        <div className="auth-card">
          {/* Left Hero Side */}
          <div className="ah">
            <div className="ah-grid" />
            <div className="ah-orb ah-orb1" />
            <div className="ah-orb ah-orb2" />
            <div className="ah-scan" />
            
            <div className="ah-z">
              <div className="brand">
                <div className="brand-mark">L</div>
                <div>
                  <div className="brand-name">Loan<em>Guard</em></div>
                  <div className="brand-tag">Default Risk Intelligence</div>
                </div>
              </div>
            </div>

            <div className="ah-z" style={{ marginTop: 'auto' }}>
              <div className="ah-headline" style={{ marginTop: '12px' }}>
                Two portals.<br /><em style={{color:'var(--gold)'}}>One platform.</em>
              </div>
              
              <div style={{ marginTop: '24px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text2)' }}>
                <p style={{ marginBottom: '16px' }}><strong style={{ color: 'var(--gold)' }}>Bank Analysts</strong> — Full risk dashboard, real LR scoring, amortization analytics, Business Insights, feature coefficients.</p>
                <p><strong style={{ color: 'var(--sky)' }}>Borrowers</strong> — Submit application, see your risk score, full repayment schedule, and tips to improve eligibility.</p>
              </div>

              <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(56,201,176,0.06)', border: '1px solid rgba(56,201,176,0.18)', borderRadius: '12px', fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>
                <span style={{ color: 'var(--teal)' }}>✦ Transparent scoring.</span> Borrowers see the same coefficients the bank uses — no black box.
              </div>
            </div>
          </div>

          {/* Right Form Side */}
          <div className="af">
            <div className="af-thm">
              <button className="theme-btn" onClick={toggleTheme}>
                <div className="theme-btn-track">
                  <div className="theme-btn-stars" />
                </div>
                <div className="theme-btn-thumb">{theme === 'dark' ? '🌙' : '☀️'}</div>
              </button>
            </div>

            <h1 className="af-h">{isSignup ? 'Create account' : 'Sign in'}</h1>
            <p className="af-sub">{isSignup ? 'Bank analyst or borrower — choose your role' : 'Enter your credentials to access the portal'}</p>

            <div className="role-tabs">
              <button 
                className={`rtab ${role === 'bank' ? 'on' : ''}`} 
                onClick={() => setRole('bank')}
              >
                🏦 Bank / Analyst
              </button>
              <button 
                className={`rtab ${role === 'borrower' ? 'on' : ''}`} 
                onClick={() => setRole('borrower')}
              >
                👤 Borrower
              </button>
            </div>

            {isSignup && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="fg">
                  <label>First Name</label>
                  <input type="text" className="fi" />
                </div>
                <div className="fg">
                  <label>Last Name</label>
                  <input type="text" className="fi" />
                </div>
              </div>
            )}

            <div className="fg">
              <label>Email Address</label>
              <input type="email" className="fi" placeholder={role === 'bank' ? "analyst@bank.com" : "user@email.com"} />
            </div>

            {isSignup && role === 'bank' && (
              <>
                <div className="fg">
                  <label>Bank / Organisation</label>
                  <input type="text" className="fi" />
                </div>
                <div className="fg">
                  <label>Role</label>
                  <select className="fselect" style={{ height: '44px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}>
                    <option>Credit Analyst</option>
                    <option>Risk Manager</option>
                    <option>Loan Officer</option>
                  </select>
                </div>
              </>
            )}

            <div className="fg">
              <label>Password</label>
              <input type="password" className="fi" placeholder="••••••••" />
            </div>

            <button 
              className="btn-main" 
              onClick={() => onLogin({ 
                first: role === 'bank' ? 'Aryan' : 'Priya', 
                last: 'Sharma', 
                type: role 
              })}
            >
              {isSignup ? 'Create Account →' : 'Sign in →'}
            </button>

            <div className="auth-link">
              {isSignup ? 'Have an account?' : 'New to LoanGuard?'} 
              <a onClick={() => setIsSignup(!isSignup)}> {isSignup ? 'Sign in' : 'Create Account'}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
