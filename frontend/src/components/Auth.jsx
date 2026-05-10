import React, { useState } from 'react';
import { apiUrl } from '../services/api';
import '../styles/index.css';
import '../styles/Shine.css';

export default function Auth({ onLogin, theme, toggleTheme, initialRole = 'borrower', onBack, isLocked = false }) {
  const [role, setRole] = useState(initialRole);
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    first: '', last: '', email: '', password: '', confirmPassword: '',
    bankName: '', bankNameManual: '', officerRole: '', officerRoleManual: ''
  });

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('Please fill all required fields');
      return;
    }
    if (isSignup && (!form.first || !form.last)) {
      setError('Please provide your full name');
      return;
    }

    setLoading(true);
    try {
      const finalBank = form.bankName === 'manual' ? form.bankNameManual : form.bankName;
      const finalRole = form.officerRole === 'manual' ? form.officerRoleManual : form.officerRole;

      const endpoint = isSignup ? '/api/signup' : '/api/login';
      const payload = isSignup ? {
        first_name: form.first,
        last_name: form.last,
        email: form.email,
        password: form.password,
        role: role
      } : { 
        email: form.email, 
        password: form.password,
        bank_name: role === 'bank' ? finalBank : undefined,
        officer_role: role === 'bank' ? finalRole : undefined
      };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      if (isSignup) {
        // After signup, automatically log them in or switch to login mode
        setIsSignup(false);
        setError('Account created! Please login.');
      } else {
        onLogin(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bank-auth-root">
      <div className="auth-overlay" />
      
      <div className="auth-nav">
        <div className="lp-logo" onClick={onBack} style={{cursor:'pointer'}}>
          <div className="logo-g">G</div>
          <div className="logo-text">GroundZero</div>
        </div>
        <button className="auth-back-link" onClick={onBack}>Return to Home</button>
      </div>

      <div className="auth-container">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="auth-badge">{role === 'bank' ? 'Institutional Access' : 'Client Portal'}</div>
            <h1 className="auth-title">
              {isSignup ? 'Create Your Account' : (role === 'bank' ? 'Bank Analyst Login' : 'Borrower Access')}
            </h1>
            <p className="auth-subtitle">
              {role === 'bank' ? 'Access your institutional underwriting dashboard.' : 'Manage your applications and risk profile.'}
            </p>
          </div>

          {!isLocked && (
            <div className="auth-role-tabs">
              <button className={`role-tab ${role === 'bank' ? 'on' : ''}`} onClick={() => setRole('bank')}>Bank Analyst</button>
              <button className={`role-tab ${role === 'borrower' ? 'on' : ''}`} onClick={() => setRole('borrower')}>Borrower</button>
            </div>
          )}

          {error && <div className="auth-alert error">{error}</div>}

          <div className="auth-form">
            {isSignup && (
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" placeholder="John" value={form.first} onChange={e => update('first', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="Doe" value={form.last} onChange={e => update('last', e.target.value)} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Institutional Email</label>
              <input type="email" placeholder="name@bank.com" value={form.email} onChange={e => update('email', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} />
            </div>

            {role === 'bank' && (
              <div className="auth-sec-box" style={{ background: 'var(--ice)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-bank)', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Institutional Bank Name</label>
                  <select className="f-inp f-select" style={{ cursor: 'pointer', background: '#fff' }} value={form.bankName} onChange={e => update('bankName', e.target.value)}>
                    <option value="">Choose Bank…</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                    <option value="Bank of Baroda">Bank of Baroda</option>
                    <option value="Canara Bank">Canara Bank</option>
                    <option value="Union Bank of India">Union Bank of India</option>
                    <option value="IDFC First Bank">IDFC First Bank</option>
                    <option value="IndusInd Bank">IndusInd Bank</option>
                    <option value="manual">Other (Specify manually)</option>
                  </select>
                </div>
                {form.bankName === 'manual' && (
                  <div className="form-group" style={{ marginTop: '-12px' }}>
                    <input type="text" placeholder="Enter Bank Name" value={form.bankNameManual} onChange={e => update('bankNameManual', e.target.value)} />
                  </div>
                )}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Officer Role</label>
                  <select className="f-inp f-select" style={{ cursor: 'pointer', background: '#fff' }} value={form.officerRole} onChange={e => update('officerRole', e.target.value)}>
                    <option value="">Choose Role…</option>
                    <option value="Credit Analyst">Credit Analyst</option>
                    <option value="Underwriter">Underwriter</option>
                    <option value="Branch Manager">Branch Manager</option>
                    <option value="Risk Officer">Risk Officer</option>
                    <option value="Loan Officer">Loan Officer</option>
                    <option value="Collection Manager">Collection Manager</option>
                    <option value="manual">Other (Specify manually)</option>
                  </select>
                </div>
                {form.officerRole === 'manual' && (
                  <div className="form-group" style={{ marginTop: '-12px' }}>
                    <input type="text" placeholder="Enter Your Role" value={form.officerRoleManual} onChange={e => update('officerRoleManual', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Secure Login')}
            </button>

            {role === 'borrower' && (
              <div className="auth-toggle">
                {isSignup ? "Already have an account?" : "Don't have an account?"}
                <span onClick={() => setIsSignup(!isSignup)}>
                  {isSignup ? 'Login Now' : 'Register Now'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="auth-info-panel">
          <div className="info-badge">Security Verified</div>
          <h2>Trusted by Financial Institutions</h2>
          <p>GroundZero provides the structural foundation for modern lending intelligence, ensuring transparent risk evaluation and structured review workflows.</p>
          <div className="info-points">
            <div className="point">✓ Secure Financial Processing</div>
            <div className="point">✓ Encrypted Data Transmission</div>
            <div className="point">✓ Institutional Audit Logs</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .bank-auth-root {
          min-height: 100vh; background: var(--ice); font-family: var(--font-sans);
          display: flex; flex-direction: column; position: relative;
        }
        .auth-overlay {
          position: absolute; inset: 0; 
          background: radial-gradient(circle at top right, rgba(153, 125, 48, 0.05), transparent 40%);
        }
        .auth-nav {
          height: 80px; padding: 0 40px; display: flex; align-items: center; justify-content: space-between;
          position: relative; z-index: 10;
        }
        .auth-back-link { 
          background: none; border: none; font-size: 14px; font-weight: 600; color: var(--slate); 
          cursor: pointer; transition: 0.2s;
        }
        .auth-back-link:hover { color: var(--navy); }

        .auth-container {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 40px; position: relative; z-index: 10;
        }
        .auth-panel {
          background: #fff; width: 480px; padding: 50px; border-radius: 20px;
          box-shadow: 0 40px 100px rgba(10, 25, 49, 0.1); border: 1px solid var(--border-bank);
        }
        .auth-info-panel {
          width: 400px; padding-left: 60px; display: flex; flex-direction: column; justify-content: center;
        }
        @media (max-width: 900px) {
          .auth-info-panel { display: none; }
          .auth-container { padding: 20px; }
          .auth-panel { width: 100%; padding: 30px; }
        }

        .auth-badge {
          display: inline-block; padding: 5px 12px; background: var(--gold-glow);
          color: var(--gold); border-radius: 4px; font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;
        }
        .auth-title { font-family: var(--font-serif); font-size: 32px; color: var(--navy); margin-bottom: 12px; }
        .auth-subtitle { font-size: 15px; color: var(--slate); opacity: 0.7; margin-bottom: 32px; }

        .auth-role-tabs {
          display: flex; background: var(--ice); padding: 5px; border-radius: 10px; margin-bottom: 32px;
        }
        .role-tab {
          flex: 1; padding: 10px; border: none; background: transparent; border-radius: 8px;
          font-size: 13px; font-weight: 700; color: var(--slate); cursor: pointer; transition: 0.2s;
        }
        .role-tab.on { background: #fff; color: var(--navy); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 11px; font-weight: 700; color: var(--slate); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .form-group input, .form-group select {
          width: 100%; padding: 14px; border-radius: 8px; border: 1.5px solid #e2e8f0;
          font-size: 14px; transition: 0.2s; outline: none;
        }
        .form-group input:focus { border-color: var(--navy); background: #f8fafc; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .btn-submit {
          width: 100%; padding: 16px; background: var(--navy); color: #fff; border: none;
          border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: 0.2s;
          margin-top: 10px;
        }
        .btn-submit:hover { background: var(--navy-deep); transform: translateY(-2px); box-shadow: 0 10px 20px rgba(10, 25, 49, 0.2); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .auth-toggle { text-align: center; margin-top: 24px; font-size: 14px; color: var(--slate); }
        .auth-toggle span { color: var(--gold); font-weight: 700; cursor: pointer; margin-left: 5px; }
        .auth-toggle span:hover { text-decoration: underline; }

        .auth-alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 24px; }
        .auth-alert.error { background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; }

        .info-badge { font-size: 10px; font-weight: 800; color: var(--gold); border-bottom: 2px solid var(--gold); width: fit-content; margin-bottom: 24px; text-transform: uppercase; }
        .auth-info-panel h2 { font-family: var(--font-serif); font-size: 36px; color: var(--navy); margin-bottom: 20px; line-height: 1.2; }
        .auth-info-panel p { font-size: 16px; color: var(--slate); line-height: 1.6; margin-bottom: 32px; }
        .info-points { display: flex; flex-direction: column; gap: 12px; }
        .point { font-size: 14px; font-weight: 600; color: var(--navy); display: flex; align-items: center; gap: 10px; }
      `}} />
    </div>
  );
}
