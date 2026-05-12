import Navbar from '../components/Navbar';

export default function LandingPage({ onEnterPortal }) {
  const heroImg = '/hero.png';

  return (
    <div className="lp-container">
      <Navbar onEnterPortal={onEnterPortal} />

      {/* Hero Section */}
      <section className="lp-hero">
        <div className="lp-content-wrap lp-hero-grid">
          <div className="lp-hero-text">
            <div className="lp-badge">Institutional-Grade Intelligence</div>
            <h1>Empowering Banks with <span className="text-gold">ML-Driven</span> Risk Intelligence.</h1>
            <p>GroundZero provides enterprise-grade risk assessment and loan lifecycle management for modern financial institutions. Seamlessly integrate data-driven insights into your underwriting workflow.</p>
            <div className="lp-hero-actions">
              <button className="lp-btn-primary" onClick={() => onEnterPortal('bank')}>Get Started as Bank</button>
              <button className="lp-btn-secondary" onClick={() => onEnterPortal('borrower')}>Apply for Loan</button>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="hero-img-container">
              <img src={heroImg} alt="GroundZero Dashboard" className="hero-main-img" />
              <div className="hero-glow"></div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="lp-about">
        <div className="lp-content-wrap">
          <div className="lp-about-grid">
            <div className="lp-about-text">
              <div className="lp-badge">Institutional Trust</div>
              <h2 className="h-serif">The Institutional Standard for <span className="text-gold">Financial Intelligence.</span></h2>
              <p>GroundZero was engineered to solve the most critical challenge in modern banking: accurately predicting risk in an increasingly complex financial landscape. We combine traditional credit metrics with advanced behavioral machine learning to provide a 360-degree view of borrower reliability.</p>
              <p>Our platform serves as a trusted bridge between institutional capital and individual growth, ensuring that every lending decision is backed by transparent, verifiable, and secure intelligence.</p>
              <div className="lp-about-stats">
                <div className="stat-item">
                  <div className="stat-val">99.9%</div>
                  <div className="stat-lbl">Uptime</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val">256-bit</div>
                  <div className="stat-lbl">Encryption</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val">Tier 1</div>
                  <div className="stat-lbl">Security</div>
                </div>
              </div>
            </div>
            <div className="lp-about-image">
              <div className="about-visual-card">
                <div className="shield-icon">🛡️</div>
                <div className="shield-text">Bank-Grade Security Protocol</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow: The Standard */}
      <section id="workflow" className="lp-workflow">
        <div className="lp-content-wrap">
          <div className="section-head text-center">
            <h2 className="h-serif">The GroundZero Standard</h2>
            <p>A structured, secure, and intelligent approach to loan risk assessment.</p>
          </div>
          <div className="lp-steps-grid">
            {[
              { n: '01', t: 'Data Submission', d: 'Borrowers submit their financial profiles through a secure, institutional portal.' },
              { n: '02', t: 'Risk Simulation', d: 'Our ML models perform real-time risk simulation across 20+ financial parameters.' },
              { n: '03', t: 'Analyst Review', d: 'Bank officers review detailed behavioral insights and sector-specific exposure.' },
              { n: '04', t: 'Institutional Decision', d: 'Execute decisions with data-backed confidence and full audit transparency.' }
            ].map(s => (
              <div key={s.n} className="lp-step-card">
                <div className="step-num">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternating Services */}
      <section id="solutions" className="lp-services">
        <div className="lp-content-wrap">
          <div className="lp-service-row">
            <div className="service-text">
              <div className="service-tag">Decision Support</div>
              <h2>Advanced Risk <span className="text-navy">Underwriting.</span></h2>
              <p>Equip your underwriters with behavioral intelligence that goes beyond simple credit scores. Our platform analyzes spending patterns, job stability, and income trends to predict default probability with 92% precision.</p>
              <ul className="service-list">
                <li>Real-time Default Probability</li>
                <li>Behavioral Flagging System</li>
                <li>Sector-wide Exposure Analytics</li>
              </ul>
            </div>
            <div className="service-visual">
              <div className="service-img-card">
                 <div className="chart-mockup">
                    <div className="mock-bar b1" style={{height: '60%'}}></div>
                    <div className="mock-bar b2" style={{height: '80%'}}></div>
                    <div className="mock-bar b3" style={{height: '45%'}}></div>
                    <div className="mock-bar b4" style={{height: '90%'}}></div>
                 </div>
              </div>
            </div>
          </div>

          <div className="lp-service-row rev">
            <div className="service-text">
              <div className="service-tag">Borrower Experience</div>
              <h2>Frictionless <span className="text-navy">Loan Simulation.</span></h2>
              <p>Provide your clients with an institutional-grade simulation experience. Borrowers can test their eligibility, track their payment schedule, and receive AI-driven tips to improve their credit standing.</p>
              <ul className="service-list">
                <li>Instant Eligibility Check</li>
                <li>Repayment Amortization</li>
                <li>Financial Health Assistant</li>
              </ul>
            </div>
            <div className="service-visual">
              <div className="service-img-card dark">
                 <div className="status-mockup">
                    <div className="mock-status s-ok">Approved</div>
                    <div className="mock-status s-wait">Pending</div>
                    <div className="mock-status s-err">Declined</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Entry Showcase */}
      <section id="platform" className="lp-portals">
        <div className="lp-content-wrap">
          <div className="section-head text-center">
            <h2 className="h-serif text-white">Two Gateways. One Platform.</h2>
            <p className="text-gray">Secure portal entry points designed for institutional collaboration.</p>
          </div>
          <div className="portals-grid">
            <div className="portal-card bank" onClick={() => onEnterPortal('bank')}>
              <div className="portal-icon">🏦</div>
              <h3>Bank Officer Portal</h3>
              <p>Access the risk assessment dashboard, manage loan applications, and analyze institutional metrics.</p>
              <span className="portal-link">Access Dashboard →</span>
            </div>
            <div className="portal-card borrower" onClick={() => onEnterPortal('borrower')}>
              <div className="portal-icon">👤</div>
              <h3>Borrower Services</h3>
              <p>Submit applications, simulate risk scores, and manage your active loan profiles securely.</p>
              <span className="portal-link">Enter Portal →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-content-wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="lp-logo">
                <span className="logo-g">G</span>
                <span className="logo-text">GroundZero</span>
              </div>
              <p>The institutional standard for AI-driven financial risk intelligence.</p>
            </div>
            <div className="footer-links">
              <div>
                <h4>Solution</h4>
                <a href="#">Risk Underwriting</a>
                <a href="#">Behavioral Models</a>
                <a href="#">Bank Dashboards</a>
              </div>
              <div>
                <h4>Company</h4>
                <a href="#">About Us</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 GroundZero Financial Systems. All institutional rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
