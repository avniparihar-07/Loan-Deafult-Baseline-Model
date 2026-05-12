import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Cpu, ShieldCheck, Layers, Zap, 
  FileText, UserCheck, Bell, PieChart 
} from 'lucide-react';

const SolutionsContent = () => (
  <div className="mega-menu-content">
    <div className="mega-col main-col">
      <div className="col-label">Institutional Solutions</div>
      <div className="mega-grid">
        {[
          { title: "AI Loan Underwriting", sub: "ML-powered default risk analysis", icon: <Cpu /> },
          { title: "Risk Intelligence", sub: "Borrower behavioral insights", icon: <ShieldCheck /> },
          { title: "EMI & Interest Engine", sub: "Lending optimization", icon: <Zap /> },
          { title: "Fraud Detection", sub: "Anomaly monitoring", icon: <Layers /> }
        ].map((item, i) => (
          <div key={i} className="mega-item">
            <div className="mega-icon">{item.icon}</div>
            <div className="mega-text">
              <div className="item-title">{item.title}</div>
              <div className="item-sub">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="mega-col side-col">
      <div className="col-label">Industries</div>
      <div className="industry-list">
        {["Retail Banking", "SME Lending", "Education Loans", "Healthcare", "Mortgage", "NBFC"].map((ind, i) => (
          <div key={i} className="industry-item">{ind}</div>
        ))}
      </div>
    </div>
  </div>
);

const WorkflowContent = () => (
  <div className="mega-menu-content">
    <div className="mega-col main-col">
      <div className="col-label">Standard Workflow</div>
      <div className="mega-grid">
        {[
          { title: "Application Intake", sub: "Secure digital onboarding", icon: <FileText /> },
          { title: "AI Assessment", sub: "Probability scoring", icon: <PieChart /> },
          { title: "Officer Review", sub: "Manual verification", icon: <UserCheck /> },
          { title: "Final Decision", sub: "Institutional approval", icon: <Bell /> }
        ].map((item, i) => (
          <div key={i} className="mega-item">
            <div className="mega-icon">{item.icon}</div>
            <div className="mega-text">
              <div className="item-title">{item.title}</div>
              <div className="item-sub">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="mega-col side-col">
      <div className="col-label">Process Flow</div>
      <div className="industry-list">
        {["KYC Check", "Analysis", "Simulation", "Decisioning", "Notification"].map((step, i) => (
          <div key={i} className="industry-item">{step}</div>
        ))}
      </div>
    </div>
  </div>
);

const NavItem = ({ label, href, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="nav-item-wrapper" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <a href={href} className={`nav-link ${isOpen ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
        {label} <ChevronDown className={`chevron ${isOpen ? 'up' : ''}`} />
      </a>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="mega-menu-container"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Navbar({ onEnterPortal }) {
  return (
    <>
      <style>{`
        .gz-navbar-outer {
          position: fixed;
          top: 24px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          z-index: 9999;
          padding: 0 20px;
        }
        .gz-pill-nav {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid #E0E7FF;
          border-radius: 999px;
          padding: 6px 32px;
          display: flex;
          align-items: center;
          gap: 32px;
          box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.1);
          height: 64px;
        }
        .nav-item-wrapper {
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
        }
        .nav-link {
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 700;
          color: #1E293B;
          cursor: pointer;
          padding: 12px 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s ease;
          text-transform: none;
          font-family: 'Inter', sans-serif;
        }
        .nav-link:hover, .nav-link.active { color: #B5944B; }
        .chevron { width: 14px; height: 14px; transition: transform 0.2s ease; }
        .chevron.up { transform: rotate(180deg); }

        .mega-menu-container {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding-top: 12px;
        }
        .mega-menu-content {
          background: white;
          border-radius: 24px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          display: flex;
          width: 680px;
          overflow: hidden;
          text-align: left;
        }
        .mega-col { padding: 32px; }
        .main-col { flex: 1; background: white; }
        .side-col { width: 220px; background: #F8FAFC; border-left: 1px solid #F1F5F9; }
        .col-label { font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
        
        .mega-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .mega-item { display: flex; gap: 14px; cursor: pointer; }
        .mega-icon { width: 40px; height: 40px; border-radius: 10px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; color: #B5944B; flex-shrink: 0; }
        .mega-icon svg { width: 20px; height: 20px; }
        .mega-item:hover .mega-icon { background: #B5944B; color: white; }
        .item-title { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
        .item-sub { font-size: 11px; color: #64748B; }

        .industry-list { display: flex; flex-direction: column; gap: 12px; }
        .industry-item { font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; transition: color 0.2s; }
        .industry-item:hover { color: #B5944B; }

        .lp-logo-pill { display: flex; align-items: center; gap: 8px; margin-right: 12px; }
        .logo-box { width: 28px; height: 28px; background: #B5944B; border-radius: 6px; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; }
        .logo-text-p { font-weight: 800; color: #0F172A; letter-spacing: -0.5px; font-size: 16px; }

        .nav-actions { display: flex; align-items: center; gap: 12px; }
        .btn-p { background: #0F172A; color: white; border: none; padding: 10px 24px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-p:hover { background: #020617; transform: translateY(-1px); }
        .btn-s { background: transparent; color: #1E293B; border: 1px solid #E2E8F0; padding: 10px 24px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-s:hover { background: #F8FAFC; border-color: #CBD5E1; }
      `}</style>

      <div className="gz-navbar-outer">
        <header className="gz-pill-nav">
          <a href="#" className="lp-logo-pill" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                border: '2px solid #B5944B', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', 
                background: '#0F172A', flexShrink: 0 
              }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  border: '1px solid rgba(181, 148, 75, 0.4)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#B5944B', fontFamily: "'Inter', sans-serif" }}>GZ</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.2px', fontFamily: "'Inter', sans-serif" }}>Ground</span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#B5944B', letterSpacing: '-0.2px', fontFamily: "'Inter', sans-serif" }}>Zero</span>
                </div>
                <div style={{ fontSize: '7px', fontWeight: '700', color: '#94A3B8', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                  Loan Intelligence Platform
                </div>
              </div>
            </div>
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px', height: '100%' }}>
            <a href="#about" className="nav-link" style={{ textDecoration: 'none' }}>About</a>
            <NavItem label="Workflow" href="#workflow">
              <WorkflowContent />
            </NavItem>
            <NavItem label="Solutions" href="#solutions">
              <SolutionsContent />
            </NavItem>
            <a href="#platform" className="nav-link" style={{ textDecoration: 'none' }}>Platform</a>
          </nav>

          <div className="nav-actions">
            <button className="btn-s" onClick={() => onEnterPortal('borrower')}>Borrower</button>
            <button className="btn-p" onClick={() => onEnterPortal('bank')}>Bank Portal</button>
          </div>
        </header>
      </div>
    </>
  );
}
