import React, { useState, useEffect } from 'react';
import { apiUrl } from '../services/api';
import '../styles/index.css';
import '../styles/Shine.css';

export default function Auth({ onLogin, onRoleChange, theme, toggleTheme, initialRole = 'borrower', onBack, isLocked = false, forcedError = '' }) {
  const [role, setRole] = useState(initialRole);
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: Token + New Pass
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(forcedError);

  const [form, setForm] = useState({
    first: '', last: '', email: '', password: '', confirmPassword: '',
    bankName: '', bankNameManual: '', officerRole: '', officerRoleManual: '',
    bankRole: 'Analyst',
    resetToken: '', newPassword: ''
  });

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validatePassword = (pass) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    return regex.test(pass);
  };


  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('Please fill all required fields');
      return;
    }

    if (isSignup) {
      if (!form.first || !form.last) {
        setError('Please provide your full name');
        return;
      }
      if (!validatePassword(form.password)) {
        setError('Password must be 8+ chars with Upper, Lower, Number & Special Char.');
        return;
      }
      if (role === 'bank') {
        const personal = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
        const domain = form.email.split('@')[1];
        if (personal.includes(domain)) {
          setError('Institutional access requires a corporate email. Gmail/Yahoo not allowed.');
          return;
        }

        const username = form.email.split('@')[0].toLowerCase();
        const authorized = ["thakkarstuti947", "avniparihar07"];
        if (!authorized.includes(username)) {
          setError('Access restricted. Only authorized institutional officers can access this portal.');
          return;
        }
      }
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
        role: role,
        bank_name: role === 'bank' ? finalBank : undefined,
        officer_role: role === 'bank' ? finalRole : undefined,
        bank_role: role === 'bank' ? form.bankRole : undefined
      } : {
        email: form.email,
        password: form.password,
        role: role
      };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (isSignup) {
        setIsSignup(false);
        setSuccessMsg('Institutional account created! You can now log in.');
      } else {
        if (data.otp_required) {
          setShowOtp(true);
          setSuccessMsg('Authentication successful. Please enter the 6-digit code sent to your email.');
        } else {
          onLogin(data);
        }
      }
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Server Unavailable: Could not connect to the authentication service. Please ensure the backend is running.');
      } else {
        setError(err.message || 'An unexpected error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');
      onLogin(data);
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Server Unavailable: Could not connect to the authentication service. Please ensure the backend is running.');
      } else {
        setError(err.message || 'An unexpected error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMsg('');
    if (!form.email) { setError('Please enter your email'); return; }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset instructions');

      setSuccessMsg('Instructions sent! Check your inbox.');
      setResetStep(2);
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Server Unavailable: Could not connect to the authentication service. Please ensure the backend is running.');
      } else {
        setError(err.message || 'An unexpected error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!form.resetToken || !form.newPassword) { setError('Please fill all fields'); return; }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          token: form.resetToken,
          new_password: form.newPassword
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      setSuccessMsg('Password updated! You can now login.');
      setTimeout(() => {
        setIsForgot(false);
        setResetStep(1);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Server Unavailable: Could not connect to the authentication service. Please ensure the backend is running.');
      } else {
        setError(err.message || 'An unexpected error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bank-auth-root">
      <div className="auth-overlay" />

      <div className="auth-nav">
        <div className="lp-logo" onClick={onBack} style={{ cursor: 'pointer' }}>
          <div className="logo-g">G</div>
          <div className="logo-text">GroundZero</div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--teal)', borderRadius: '50%', boxShadow: '0 0 10px var(--teal)' }} /> ENCRYPTED SESSION
          </div>
          <button className="auth-back-link" onClick={onBack}>Return to Home</button>
        </div>
      </div>

      <div className="auth-container">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="auth-badge">{role === 'bank' ? 'SECURE OFFICER PORTAL' : 'Client Access Portal'}</div>
            <h1 className="auth-title">
              {showOtp ? 'Identity Verification' : (isForgot ? 'Reset Password' : (isSignup ? 'Create Your Account' : (role === 'bank' ? 'Bank Officer Login' : 'Borrower Access')))}
            </h1>
            <p className="auth-subtitle">
              {showOtp ? `A secure 6-digit code was sent to your registered email.` : (isForgot ? 'Follow instructions sent to your email.' : (role === 'bank' ? 'Authorized personnel access only. Please enter your institutional credentials.' : 'Manage your applications and risk profile.'))}
            </p>
          </div>

          {!isLocked && !isForgot && !showOtp && (
            <div style={{ marginBottom: '20px' }} />
          )}

          {error && <div className="auth-alert error">{error}</div>}
          {successMsg && <div className="auth-alert success">{successMsg}</div>}

          <div className="auth-form">
            {showOtp ? (
              <>
                <div className="form-group">
                  <label>Institutional OTP Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="000000"
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px', fontWeight: 800, background: 'var(--bg)', border: '2px solid var(--border-bank)' }}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button className="btn-submit" onClick={handleOtpSubmit} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Enter Dashboard'}
                </button>
                <div className="auth-toggle">
                  Didn't receive code? <span onClick={() => { setShowOtp(false); handleSubmit(); }}>Resend OTP</span>
                </div>
              </>
            ) : isForgot ? (
              <>
                {resetStep === 1 ? (
                  <div className="form-group">
                    <label>{role === 'bank' ? 'Officer Institutional Email' : 'Email Address'}</label>
                    <input type="email" placeholder={role === 'bank' ? 'name@bank.com' : 'name@example.com'} value={form.email} onChange={e => update('email', e.target.value)} />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Verification Token</label>
                      <input type="text" placeholder="RESET-XXXX" value={form.resetToken} onChange={e => update('resetToken', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input type="password" placeholder="••••••••" value={form.newPassword} onChange={e => update('newPassword', e.target.value)} />
                    </div>
                  </>
                )}
                <button className="btn-submit" onClick={resetStep === 1 ? handleForgotPassword : handleResetPassword} disabled={loading}>
                  {loading ? 'Processing...' : (resetStep === 1 ? 'Send Reset Link' : 'Update Password')}
                </button>
                <div className="auth-toggle">
                  Remembered it? <span onClick={() => { setIsForgot(false); setResetStep(1); setError(''); setSuccessMsg(''); }}>Back to Login</span>
                </div>
              </>
            ) : (
              <>
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
                  <label>{role === 'bank' ? 'Officer Institutional Email' : 'Email Address'}</label>
                  <input type="email" placeholder={role === 'bank' ? 'name@bank.com' : 'name@example.com'} value={form.email} onChange={e => update('email', e.target.value)} />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label>Password</label>
                    <span onClick={() => setShowPassword(!showPassword)} style={{ fontSize: '10px', color: 'var(--gold)', cursor: 'pointer', fontWeight: 800 }}>{showPassword ? 'HIDE' : 'SHOW'}</span>
                  </div>
                  <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} />
                  {isSignup && (
                    <div style={{ fontSize: '10px', marginTop: '6px', color: validatePassword(form.password) ? 'var(--teal)' : 'var(--slate)', fontWeight: 600 }}>
                      {validatePassword(form.password) ? '✓ Password Complexity Met' : 'Requires: 8+ chars, Upper, Lower, Number, Special Char'}
                    </div>
                  )}
                  {!isSignup && (
                    <div style={{ textAlign: 'right', marginTop: '6px' }}>
                      <span className="forgot-link" onClick={() => { setIsForgot(true); setError(''); setSuccessMsg(''); }}>Forgot Password?</span>
                    </div>
                  )}
                </div>

                {role === 'bank' && isSignup && (
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
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label>Account Privilege Level</label>
                      <select className="f-inp f-select" style={{ cursor: 'pointer', background: '#fff' }} value={form.bankRole} onChange={e => update('bankRole', e.target.value)}>
                        <option value="Analyst">Analyst (L1 Review)</option>
                        <option value="Senior Analyst">Senior Analyst (L2 Review)</option>
                        <option value="Manager">Manager (Approval Authority)</option>
                        <option value="Admin">Admin (System Control)</option>
                      </select>
                    </div>
                  </div>
                )}

                <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Authenticating...' : (isSignup ? 'Create Account' : (role === 'bank' ? 'Secure Officer Login' : 'Sign In'))}
                </button>

                <div className="auth-toggle">
                  {role === 'bank' ? (
                    <div style={{ fontSize: '12px', color: 'var(--slate)', opacity: 0.8, marginTop: '12px' }}>
                      Need access? <span style={{ cursor: 'default', textDecoration: 'none', color: 'var(--navy)' }}>Contact your system administrator</span>
                    </div>
                  ) : (
                    <>
                      {isSignup ? "Already have an account?" : "Don't have an account?"}
                      <span onClick={() => { setIsSignup(!isSignup); setError(''); setSuccessMsg(''); setShowOtp(false); }}>
                        {isSignup ? 'Login Now' : 'Register Now'}
                      </span>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {role === 'bank' ? 'GroundZero Internal Banking Portal' : 'GroundZero Client Ecosystem'}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--slate)', opacity: 0.6, marginTop: '4px' }}>
                    {role === 'bank' ? 'Restricted Institutional Access' : 'Secure Digital Finance'} • System ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="auth-info-panel">
          <div className="info-badge">Institutional Access Protocol</div>
          <h2>Trusted by Global Financial Teams</h2>
          <p>GroundZero provides the secure structural foundation for institutional lending intelligence and structured review workflows.</p>
          <div className="info-points">
            <div className="point">✔ Multi-Factor Authentication (OTP)</div>
            <div className="point">✔ AES-256 Session Encryption</div>
            <div className="point">✔ Institutional Domain Validation</div>
            <div className="point">✔ Role-Based Audit Logging</div>
          </div>

          <div style={{ marginTop: '40px', padding: '24px', background: 'var(--navy-deep)', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 20px rgba(10,25,49,0.1)' }}>
            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--gold)', letterSpacing: '2px', marginBottom: '8px' }}>SECURITY STATUS</div>
            <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
              System Monitored & Encrypted
            </div>
            <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '12px', lineHeight: 1.5 }}>Always verify you are on the official bank portal before entering credentials. Your session will auto-expire after 15 minutes of inactivity.</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
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
        .auth-alert.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }

        .forgot-link { font-size: 12px; color: var(--gold); font-weight: 600; cursor: pointer; }
        .forgot-link:hover { text-decoration: underline; }

        .info-badge { font-size: 10px; font-weight: 800; color: var(--gold); border-bottom: 2px solid var(--gold); width: fit-content; margin-bottom: 24px; text-transform: uppercase; }
        .auth-info-panel h2 { font-family: var(--font-serif); font-size: 36px; color: var(--navy); margin-bottom: 20px; line-height: 1.2; }
        .auth-info-panel p { font-size: 16px; color: var(--slate); line-height: 1.6; margin-bottom: 32px; }
        .info-points { display: flex; flex-direction: column; gap: 12px; }
        .point { font-size: 14px; font-weight: 600; color: var(--navy); display: flex; align-items: center; gap: 10px; }
      `}} />
    </div>
  );
}
