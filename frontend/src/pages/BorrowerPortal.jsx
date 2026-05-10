import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ArthaAI from '../components/ArthaAI';
import { calcRisk, buildSched, fmt, fmtK } from '../utils/model';
import { apiUrl } from '../services/api';

export default function BorrowerPortal({ user, onLogout, theme, toggleTheme }) {
  const [page, setPage] = useState('bpg-simulator');
  const [formData, setFormData] = useState({
    age: '', credit: '', income: '', loanAmt: '', dti: '', dtiDebt: '', dtiIncome: '', lines: '',
    purpose: 'other', term: 24, rate: '', empType: 'full', empl: '',
    edu: 'bach', marital: 'married', state: '', extLoanAmt: '', extEmi: '',
    customPurpose: '', customTerm: '', extBank: '', extLoanType: 'personal',
    jobChanges: '', targetBank: '', targetBankCustom: ''
  });
  const [flags, setFlags] = useState({ mort: 'N', dep: 'N', co: 'N', extloan: 'N' });
  // Official application form state
  const [applyForm, setApplyForm] = useState({
    loanAmt: '', purpose: 'other', customPurpose: '', term: 24, customTerm: '',
    empType: 'full', empl: '', jobChanges: '', edu: 'bach', marital: 'married',
    state: '', dtiDebt: '', dtiIncome: '', dti: '', lines: '',
    targetBank: '', targetBankCustom: ''
  });
  const [applyFlags, setApplyFlags] = useState({ mort: 'N', dep: 'N', co: 'N', extloan: 'N' });
  const [applyResult, setApplyResult] = useState(null); // { id, status }
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [idType, setIdType] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [viewForm, setViewForm] = useState(null);
  const [viewFlags, setViewFlags] = useState(null);
  const [result, setResult] = useState(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [expandSched, setExpandSched] = useState(false);
  const [myApps, setMyApps] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // States to preserve draft form while viewing a past application
  const [draftData, setDraftData] = useState(null);
  const [draftFlags, setDraftFlags] = useState(null);
  const [draftResult, setDraftResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showInsights, setShowInsights] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const getActiveProfile = () => {
    if (myApps && myApps.length > 0) {
      const approvedApp = myApps.find(a => a.status === 'Approved');
      if (approvedApp) return { source: 'bank_approved', level: 'low', dti: approvedApp.dti, prob: approvedApp.probability, msg: "Based on your approved loan structure and financial stability, these investments may suit your profile." };

      const rejectedApp = myApps.find(a => a.status === 'Rejected');
      if (rejectedApp) return { source: 'bank_rejected', level: 'high', dti: rejectedApp.dti, prob: rejectedApp.probability, msg: "Focus on reducing liabilities before entering volatile investments. Based on your official application, conservative assets are recommended." };

      const pendingApp = myApps.find(a => a.status === 'Pending' || a.status === 'Under Review');
      if (pendingApp) return { source: 'bank_pending', level: 'med', dti: pendingApp.dti, prob: pendingApp.probability, msg: "Your application is under review. Here are some moderate suggestions while you wait." };
    }

    if (result) {
      return { source: 'simulator', level: result.level, pct: result.pct, prob: result.prob, msg: `Recommendations Based on Simulation. You may safely explore ${result.level === 'low' ? 'higher-return' : result.level === 'med' ? 'moderate-risk' : 'conservative'} investments.` };
    }

    return null;
  };

  const activeProfile = getActiveProfile();

  const eduMap = { hs: "High School", bach: "Bachelor's", mast: "Master's", phd: "PhD" };
  const empMap = { full: "Full-time", part: "Part-time", self: "Self-employed", unemployed: "Unemployed" };
  const maritalMap = { single: "Single", married: "Married", divorced: "Divorced" };
  const purposeMap = { home: "Home", auto: "Auto", education: "Education", business: "Business", medical: "Medical", personal: "Personal Loan", other: "Other", custom: "Other" };

  const isApply = page === 'bpg-apply';
  const isView = page === 'bpg-view-app';
  const curData = isView ? viewForm : (isApply ? applyForm : formData);
  const curFlags = isView ? viewFlags : (isApply ? applyFlags : flags);

  const effectiveTerm = curData.term === 'custom' ? (parseInt(curData.customTerm) || 24) : (parseInt(curData.term) || 24);
  const displayPurpose = curData.purpose === 'custom' ? curData.customPurpose : (purposeMap[curData.purpose] || curData.purpose);

  const update = (k, v) => {
    if (isReadOnly || isView) return;
    if (isApply) setApplyForm(prev => ({ ...prev, [k]: v }));
    else setFormData(prev => ({ ...prev, [k]: v }));
  };

  const tog = (k, v) => {
    if (isReadOnly || isView) return;
    if (isApply) setApplyFlags(prev => ({ ...prev, [k]: v }));
    else setFlags(prev => ({ ...prev, [k]: v }));
  };

  const fetchMyApps = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(apiUrl(`/api/my-applications?email=${encodeURIComponent(user.email)}`));
      if (res.ok) {
        const data = await res.json();
        setMyApps(data);
      }
    } catch (err) {
      console.error('Failed to fetch my applications:', err);
    }
  };

  useEffect(() => {
    resetForm();
    fetchMyApps();
  }, [user.email]);

  const handleViewApp = (app) => {
    // Save current unsubmitted work before overwriting with historical data
    if (!isReadOnly) {
      setDraftData(formData);
      setDraftFlags(flags);
      setDraftResult(result);
    }

    const stdTerms = [12, 24, 36, 48, 60];
    const stdPurposes = ['home', 'auto', 'education', 'business', 'medical', 'personal', 'other'];
    const isCustomTerm = !stdTerms.includes(parseInt(app.term));
    const isCustomPurp = !stdPurposes.includes(app.loan_purpose?.toLowerCase());

    setViewForm({
      age: app.age, credit: app.credit_score, income: app.income, loanAmt: app.loan_amount,
      dti: app.dti, lines: app.num_credit_lines,
      purpose: isCustomPurp ? 'custom' : app.loan_purpose?.toLowerCase(),
      customPurpose: isCustomPurp ? app.loan_purpose : '',
      term: isCustomTerm ? 'custom' : parseInt(app.term),
      customTerm: isCustomTerm ? app.term : '',
      rate: app.interest_rate,
      empType: app.employment_type === "Full-time" ? "full" : app.employment_type === "Part-time" ? "part" : app.employment_type === "Self-employed" ? "self" : "unemployed",
      empl: app.months_employed,
      edu: app.education === "High School" ? "hs" : app.education === "Bachelor's" ? "bach" : app.education === "Master's" ? "mast" : "phd",
      marital: app.marital_status?.toLowerCase(), state: app.state,
      extLoanAmt: 0, extEmi: 0, extBank: '', extLoanType: 'personal',
      jobChanges: app.job_changes || 0,
      targetBank: app.target_bank, targetBankCustom: ''
    });
    setViewFlags({
      mort: app.has_mortgage === 'Yes' ? 'Y' : 'N',
      dep: app.has_dependents === 'Yes' ? 'Y' : 'N',
      co: app.has_cosigner === 'Yes' ? 'Y' : 'N',
      extloan: app.has_existing_loan === 'Yes' ? 'Y' : 'N'
    });

    const sched = buildSched(app.loan_amount, app.interest_rate, app.term);
    setResult({
      pct: Math.round(app.probability * 100),
      level: app.risk_category?.toLowerCase() || 'low',
      sched,
      prob: app.probability,
      hasExtLoan: app.has_existing_loan === 'Yes',
      extAmt: 0,
      extEmi: 0,
      pctWithout: null,
      riskDelta: 0,
      adjustedD: { ...app }
    });
    setIsReadOnly(true);
    setPage('bpg-view-app'); // New page for dual view
  };

  const resetForm = () => {
    setIsReadOnly(false);
    setResult(null);
    setFormData({
      age: '', credit: '', income: '', loanAmt: '', dti: '', dtiDebt: '', dtiIncome: '', lines: '',
      purpose: 'other', term: 24, rate: '', empType: 'full', empl: '',
      edu: 'bach', marital: 'married', state: '', extLoanAmt: '', extEmi: '',
      customPurpose: '', customTerm: '', extBank: '', extLoanType: 'personal',
      jobChanges: '', targetBank: '', targetBankCustom: ''
    });
    setFlags({ mort: 'N', dep: 'N', co: 'N', extloan: 'N' });
    setViewForm(null);
    setViewFlags(null);
    setDraftData(null);
    setDraftFlags(null);
    setDraftResult(null);
    setIdType('');
    setIdFile(null);
  };

  const handleOfficialApply = async () => {
    const purposeMap = { home: 'Home', auto: 'Auto', education: 'Education', business: 'Business', medical: 'Other', personal: 'Other', other: 'Other', custom: 'Other' };
    const eduMap2 = { hs: 'High School', bach: "Bachelor's", mast: "Master's", phd: 'PhD' };
    const empMap2 = { full: 'Full-time', part: 'Part-time', self: 'Self-employed', unemployed: 'Unemployed' };
    const marMap2 = { single: 'Single', married: 'Married', divorced: 'Divorced' };
    const effectivePurpose2 = applyForm.purpose === 'custom' ? (applyForm.customPurpose || 'Other') : applyForm.purpose;
    const effectiveTerm2 = applyForm.term === 'custom' ? (parseInt(applyForm.customTerm) || 24) : parseInt(applyForm.term) || 24;
    const targetBankFinal = applyForm.targetBank === '__custom__' ? (applyForm.targetBankCustom || '').trim() : applyForm.targetBank;

    // Check required fields (same as simulator minus rate)
    const requiredFields = ['age', 'credit', 'income', 'loanAmt', 'dti', 'lines', 'empl', 'jobChanges'];
    const missing = requiredFields.filter(key => applyForm[key] === '' || applyForm[key] === null || Number.isNaN(Number(applyForm[key])));

    if (missing.length > 0) {
      alert('Please fill all required fields before submitting.');
      return;
    }
    if (!targetBankFinal) { alert('Please select the bank you are applying to.'); return; }
    if (!idType) { alert('Please select a document type for identity verification.'); return; }
    if (!idFile) { alert('Please upload your verification document.'); return; }

    setApplySubmitting(true);
    const payload = {
      FullName: `${user?.first} ${user?.last}`.trim(),
      Email: user?.email,
      Age: applyForm.age || 25,
      Income: applyForm.income || 0,
      LoanAmount: applyForm.loanAmt,
      CreditScore: applyForm.credit || 0,
      MonthsEmployed: applyForm.empl,
      NumCreditLines: applyForm.lines || 1,
      LoanTerm: effectiveTerm2,
      DTIRatio: applyForm.dti || 0,
      Education: eduMap2[applyForm.edu] || "Bachelor's",
      EmploymentType: empMap2[applyForm.empType] || 'Full-time',
      MaritalStatus: marMap2[applyForm.marital] || 'Single',
      HasMortgage: applyFlags.mort === 'Y' ? 'Yes' : 'No',
      HasDependents: applyFlags.dep === 'Y' ? 'Yes' : 'No',
      LoanPurpose: purposeMap[effectivePurpose2] || 'Other',
      HasCoSigner: applyFlags.co === 'Y' ? 'Yes' : 'No',
      HasExistingLoan: applyFlags.extloan === 'Y' ? 'Yes' : 'No',
      JobChanges: applyForm.jobChanges || 0,
      State: applyForm.state || 'MH',
      TargetBank: targetBankFinal,
    };
    try {
      const res = await fetch(apiUrl('/api/apply'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        setApplyResult({ id: data.id, status: 'Pending' });
        fetchMyApps();
      } else {
        alert('Submission failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Submission error:', e);
      alert('Network error or server unavailable. Please ensure the backend is running at http://localhost:5000');
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleSimulate = async () => {
    const requiredFields = [
      ['age', 'Age'],
      ['credit', 'Credit Score'],
      ['income', 'Annual Income'],
      ['loanAmt', 'Loan Amount'],
      ['dti', 'DTI Ratio'],
      ['lines', 'Credit Lines'],
      ['rate', 'Interest Rate (for simulation)'],
      ['empl', 'Months Employed'],
      ['jobChanges', 'Job Changes']
    ];
    const missing = requiredFields
      .filter(([key]) => formData[key] === '' || formData[key] === null || Number.isNaN(Number(formData[key])))
      .map(([, label]) => label);

    if (missing.length) {
      alert(`Please enter valid values for: ${missing.join(', ')}`);
      return;
    }

    if (Number(formData.income) <= 0) { alert('Annual Income must be greater than 0'); return; }
    if (Number(formData.loanAmt) <= 0) { alert('Loan Amount must be greater than 0'); return; }
    if (Number(formData.dti) < 0 || Number(formData.dti) > 1) { alert('Please enter valid Monthly Debt and Monthly Income values — the calculated DTI must be between 0% and 100%.'); return; }

    const hasExtLoan = flags.extloan === 'Y';
    const extAmt = hasExtLoan ? formData.extLoanAmt : 0;
    const extEmi = hasExtLoan ? formData.extEmi : 0;

    let adjustedD = { ...formData };
    if (hasExtLoan) {
      const monthlyInc = formData.income / 12 || 1;
      adjustedD.dti = Math.min(formData.dti + (extEmi / monthlyInc), 0.99);
      adjustedD.lines = formData.lines + 1;
    }

    const effectivePurpose = formData.purpose === 'custom' ? (formData.customPurpose || "Other") : (formData.purpose || "other");

    const payload = {
      Age: adjustedD.age,
      Income: adjustedD.income,
      LoanAmount: adjustedD.loanAmt,
      CreditScore: adjustedD.credit,
      MonthsEmployed: adjustedD.empl,
      NumCreditLines: adjustedD.lines,
      InterestRate: adjustedD.rate,
      LoanTerm: effectiveTerm,
      DTIRatio: adjustedD.dti,
      Education: eduMap[adjustedD.edu] || "Bachelor's",
      EmploymentType: empMap[adjustedD.empType] || "Full-time",
      MaritalStatus: maritalMap[adjustedD.marital] || "Single",
      HasMortgage: flags.mort === 'Y' ? "Yes" : "No",
      HasDependents: flags.dep === 'Y' ? "Yes" : "No",
      LoanPurpose: purposeMap[effectivePurpose] || "Other",
      HasCoSigner: flags.co === 'Y' ? "Yes" : "No",
      HasExistingLoan: flags.extloan === 'Y' ? "Yes" : "No",
      ExistingBank: formData.extBank === 'custom' ? formData.extBankCustom : formData.extBank,
      ExistingRate: formData.extRate || 0,
      ExistingPurpose: formData.extLoanType === 'custom' ? formData.extLoanTypeCustom : formData.extLoanType,
      FullName: `${user?.first} ${user?.last}`.trim() || "Anonymous",
      Email: user?.email,
      State: formData.state || 'MH',
      JobChanges: formData.jobChanges || 0,
      TargetBank: formData.targetBank === '__custom__'
        ? (formData.targetBankCustom || '').trim()
        : (formData.targetBank || '')
    };

    try {
      const res = await fetch(apiUrl('/api/predict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('API error');
      const apiResult = await res.json();

      const prob = apiResult.default_probability;
      const pct = Math.round(prob * 100);
      const level = prob < 0.3 ? 'low' : prob < 0.6 ? 'med' : 'high';
      const probWithout = hasExtLoan ? calcRisk(formData, { mort: flags.mort, dep: flags.dep, co: flags.co }) : null;
      const pctWithout = probWithout ? Math.round(probWithout * 100) : null;
      const riskDelta = hasExtLoan ? (pct - pctWithout) : 0;
      const sched = buildSched(formData.loanAmt, formData.rate, effectiveTerm);

      setResult({ pct, level, sched, prob, hasExtLoan, extAmt, extEmi, pctWithout, riskDelta, adjustedD });
      setPage('bpg-simulator');
    } catch (err) {
      console.warn('[GroundZero] API unreachable, using local model fallback:', err);
      const prob = calcRisk(adjustedD, { mort: flags.mort === 'Y' || (hasExtLoan && formData.extLoanType === 'home') ? 'Y' : 'N', dep: flags.dep, co: flags.co });
      const pct = Math.round(prob * 100);
      const level = prob < 0.3 ? 'low' : prob < 0.6 ? 'med' : 'high';
      const probWithout = hasExtLoan ? calcRisk(formData, { mort: flags.mort, dep: flags.dep, co: flags.co }) : null;
      const pctWithout = probWithout ? Math.round(probWithout * 100) : null;
      const riskDelta = hasExtLoan ? (pct - pctWithout) : 0;
      const sched = buildSched(formData.loanAmt, formData.rate, effectiveTerm);
      setResult({ pct, level, sched, prob, hasExtLoan, extAmt, extEmi, pctWithout, riskDelta, adjustedD });
      setPage('bpg-simulator');
    }
  };

  const [liveData, setLiveData] = useState({ btc: null, eth: null, loading: true });

  useEffect(() => {
    if (page === 'bpg-stocks') {
      setLiveData(prev => ({ ...prev, loading: true }));
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=inr&include_24hr_change=true')
        .then(res => res.json())
        .then(data => {
          setLiveData({
            btc: data.bitcoin,
            eth: data.ethereum,
            loading: false
          });
        })
        .catch(() => setLiveData(prev => ({ ...prev, loading: false })));
    }
  }, [page]);

  const generateSvgPath = (asset) => {
    const isCrypto = asset === 'BTC';
    const isSafe = asset === 'SGB' || asset === 'FD';
    const points = [];
    let currentY = isSafe ? 80 : 50;

    // Create 30 data points for the trend
    for (let i = 0; i <= 30; i++) {
      const x = (i / 30) * 100;
      const volatility = isSafe ? 2 : isCrypto ? 15 : 8;
      const trend = isSafe ? -i * 0.5 : (Math.sin(i / 2) * 10) - (i * 0.5);

      // We use seeded random logic based on index to avoid jumping on re-renders
      // but simple Math.sin adds enough "random" looking bumps
      const pseudoRandom = Math.sin(i * 12.34) * volatility;

      currentY = currentY + trend + pseudoRandom;
      currentY = Math.max(10, Math.min(90, currentY));

      points.push(`${x},${currentY}`);
    }
    return points;
  };

  return (
    <div className="app-shell active">
      <Sidebar
        user={user}
        activePage={page}
        setPage={(p) => {
          if (p === 'bpg-simulator') {
            resetForm(); // Always open fresh
          }
          setPage(p);
        }}
        onLogout={onLogout}
        type="borrower"
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="main-area">
        <div className="page-content">
          {page === 'bpg-view-app' && viewForm && result ? (
            <ApplicationSummaryView
              data={viewForm}
              flags={viewFlags}
              result={result}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              onBack={() => setPage('bpg-history')}
            />
          ) : (page === 'bpg-simulator' || page === 'bpg-apply') && (
            <div className="fade-in">
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="pg-sub">
                  {isReadOnly ? (
                    <h1 className="h-serif" style={{ fontSize: '32px' }}>Viewing Application: <span style={{ color: 'var(--sky)' }}>{user?.first} {user?.last}</span></h1>
                  ) : page === 'bpg-apply' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h1 className="h-serif" style={{ fontSize: '32px' }}>Apply <span style={{ color: 'var(--sky)' }}>Loan</span></h1>
                      <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>Send your loan request to the bank.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h1 className="h-serif" style={{ fontSize: '32px' }}>Check <span style={{ color: 'var(--sky)' }}>Eligibility</span></h1>
                      <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>See your loan approval chance and monthly EMI.</p>
                    </div>
                  )}
                </div>
                {isReadOnly && (
                  <button className="bp-btn" onClick={() => { resetForm(); setPage('bpg-apply'); }} style={{ padding: '8px 20px', width: 'auto', fontSize: '13px' }}>
                    + Start New Application
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* CONTAINER 1: INPUTS */}
                <div className="card glass mb18" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.05)' }}>
                  <div style={{ background: 'linear-gradient(to right, var(--navy), #1a3a5f)', padding: '24px 32px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Secure Gateway</div>
                      <h2 style={{ margin: '0', fontSize: '22px', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                        {page === 'bpg-apply' ? 'Apply Loan' : 'Check Eligibility'}
                      </h2>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 10px #4ade80' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>ML ENGINE ACTIVE</span>
                    </div>
                  </div>

                  <div style={{ padding: '32px' }}>
                    <div style={{ background: 'var(--ice)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)', marginBottom: '4px' }}>
                          {page === 'bpg-apply' ? 'Official Loan Application' : 'Institutional Eligibility Check'}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--slate)', lineHeight: '1.6', opacity: 0.8 }}>
                          {page === 'bpg-apply'
                            ? 'Please fill in your details to send a formal loan request to the bank. Your request will be reviewed shortly.'
                            : 'Fill in the basic details below to quickly see if you are eligible for the loan and check your monthly EMI.'}
                        </div>
                      </div>
                    </div>

                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
                      <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'var(--gold-glow)', color: 'var(--gold)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>01</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Your Financial Profile</div>
                      </div>
                      <div>
                        <div className="flab">Age</div>
                        <input type="number" className="finput" value={curData.age} onChange={e => update('age', +e.target.value)} disabled={isReadOnly} />
                      </div>
                      <div>
                        <div className="flab">Credit Score</div>
                        <input type="number" className="finput" value={curData.credit} onChange={e => update('credit', +e.target.value)} disabled={isReadOnly} />
                      </div>
                      <div>
                        <div className="flab">Education Level</div>
                        <select className="fselect" value={curData.edu} onChange={e => update('edu', e.target.value)} disabled={isReadOnly}>
                          <option value="hs">High School</option><option value="bach">Bachelor's</option><option value="mast">Master's</option><option value="phd">PhD</option>
                        </select>
                      </div>
                      <div>
                        <div className="flab">Marital Status</div>
                        <select className="fselect" value={curData.marital} onChange={e => update('marital', e.target.value)} disabled={isReadOnly}>
                          <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
                        </select>
                      </div>
                      <div>
                        <div className="flab">State / Region</div>
                        <select className="fselect" value={curData.state} onChange={e => update('state', e.target.value)} disabled={isReadOnly}>
                          <option value="">Select State / UT…</option>
                          <optgroup label="States">
                            <option value="AP">Andhra Pradesh</option>
                            <option value="AR">Arunachal Pradesh</option>
                            <option value="AS">Assam</option>
                            <option value="BR">Bihar</option>
                            <option value="CG">Chhattisgarh</option>
                            <option value="GA">Goa</option>
                            <option value="GJ">Gujarat</option>
                            <option value="HR">Haryana</option>
                            <option value="HP">Himachal Pradesh</option>
                            <option value="JH">Jharkhand</option>
                            <option value="KA">Karnataka</option>
                            <option value="KL">Kerala</option>
                            <option value="MP">Madhya Pradesh</option>
                            <option value="MH">Maharashtra</option>
                            <option value="MN">Manipur</option>
                            <option value="ML">Meghalaya</option>
                            <option value="MZ">Mizoram</option>
                            <option value="NL">Nagaland</option>
                            <option value="OD">Odisha</option>
                            <option value="PB">Punjab</option>
                            <option value="RJ">Rajasthan</option>
                            <option value="SK">Sikkim</option>
                            <option value="TN">Tamil Nadu</option>
                            <option value="TS">Telangana</option>
                            <option value="TR">Tripura</option>
                            <option value="UP">Uttar Pradesh</option>
                            <option value="UK">Uttarakhand</option>
                            <option value="WB">West Bengal</option>
                          </optgroup>
                          <optgroup label="Union Territories">
                            <option value="AN">Andaman &amp; Nicobar Islands</option>
                            <option value="CH">Chandigarh</option>
                            <option value="DN">Dadra &amp; Nagar Haveli and Daman &amp; Diu</option>
                            <option value="DL">Delhi (NCT)</option>
                            <option value="JK">Jammu &amp; Kashmir</option>
                            <option value="LA">Ladakh</option>
                            <option value="LD">Lakshadweep</option>
                            <option value="PY">Puducherry</option>
                          </optgroup>
                        </select>
                      </div>
                      <div>
                        <div className="flab">Annual Income (₹)</div>
                        <input type="number" className="finput" value={curData.income} onChange={e => update('income', +e.target.value)} disabled={isReadOnly} />
                      </div>
                      <div>
                        <div className="flab">Loan Amount (₹)</div>
                        <input type="number" className="finput" value={curData.loanAmt} onChange={e => update('loanAmt', +e.target.value)} disabled={isReadOnly} />
                      </div>
                      <div className="fg-full" style={{ gridColumn: '1 / -1', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                        <div className="flab" style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>DTI — <span style={{ fontWeight: 400, color: 'var(--text2)' }}>Debt-to-Income Ratio (% of income used for EMI)</span> <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '11px', marginLeft: '8px' }}>(Optional)</span></span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 400, marginBottom: '12px' }}>What % of your monthly income goes toward loan repayments?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>💸 Total Monthly Debt Payments (₹)</div>
                            <input
                              type="number"
                              className="finput"
                              placeholder="e.g. 5000"
                              value={curData.dtiDebt || ''}
                              onChange={e => {
                                const debt = +e.target.value || 0;
                                const inc = curData.dtiIncome || (curData.income / 12) || 1;
                                update('dtiDebt', +e.target.value);
                                update('dti', inc > 0 ? Math.min(parseFloat((debt / inc).toFixed(4)), 0.99) : 0);
                              }}
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>💰 Your Monthly Income (₹)</div>
                            <input
                              type="number"
                              className="finput"
                              placeholder={curData.income > 0 ? `Auto: ₹${Math.round(curData.income / 12).toLocaleString('en-IN')}` : 'e.g. 50000'}
                              value={curData.dtiIncome || ''}
                              onChange={e => {
                                const inc = +e.target.value || 1;
                                const debt = curData.dtiDebt || 0;
                                update('dtiIncome', +e.target.value);
                                update('dti', inc > 0 ? Math.min(parseFloat((debt / inc).toFixed(4)), 0.99) : 0);
                              }}
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                        {curData.dti !== '' && curData.dtiDebt >= 0 && (
                          <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '9px', background: curData.dti < 0.36 ? 'rgba(38,166,154,0.08)' : curData.dti < 0.5 ? 'rgba(201,151,60,0.08)' : 'rgba(232,84,117,0.08)', border: curData.dti < 0.36 ? '1px solid rgba(38,166,154,0.2)' : curData.dti < 0.5 ? '1px solid rgba(201,151,60,0.2)' : '1px solid rgba(232,84,117,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 900 }}>{curData.dti < 0.36 ? '✓' : curData.dti < 0.5 ? '!' : '✕'}</span>
                            <span>
                              <strong style={{ color: curData.dti < 0.36 ? 'var(--teal)' : curData.dti < 0.5 ? 'var(--gold)' : 'var(--rose)', fontSize: '16px' }}>
                                DTI = {(curData.dti * 100).toFixed(1)}%
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flab">Credit Lines <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: '11px' }}>(Total no. of active loans or cards)</span> <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '11px', marginLeft: '8px' }}>(Optional)</span></div>
                        <input type="number" className="finput" value={curData.lines} onChange={e => update('lines', +e.target.value)} disabled={isReadOnly} />
                      </div>

                      <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(75,168,224,0.1)', color: 'var(--sky)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>02</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sky)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Loan Details</div>
                      </div>
                      <div>
                        <div className="flab">Purpose</div>
                        <div className="combo-field">
                          <select className={`fselect ${curData.purpose === 'custom' ? 'has-manual' : ''}`} value={curData.purpose} onChange={e => update('purpose', e.target.value)} disabled={isReadOnly}>
                            <option value="home">Home</option><option value="auto">Auto</option><option value="education">Education</option><option value="business">Business</option><option value="medical">Medical</option><option value="personal">Personal Loan</option><option value="custom">Write your own…</option>
                          </select>
                          <input
                            className={`combo-manual ${curData.purpose === 'custom' ? 'show' : ''}`}
                            placeholder="e.g. Wedding, Medical, Machinery…"
                            value={curData.customPurpose}
                            onChange={e => update('customPurpose', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flab">Term <span className="combo-tag">+ Custom</span></div>
                        <div className="combo-field">
                          <select className={`fselect ${curData.term === 'custom' ? 'has-manual' : ''}`} value={curData.term} onChange={e => update('term', e.target.value)} disabled={isReadOnly}>
                            <option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="custom">Enter months manually…</option>
                          </select>
                          <input
                            type="number"
                            className={`combo-manual ${curData.term === 'custom' ? 'show' : ''}`}
                            placeholder="e.g. 18, 42, 72 months…"
                            value={curData.customTerm}
                            onChange={e => update('customTerm', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                      {page === 'bpg-simulator' && (
                        <div>
                          <div className="flab">Expected Interest Rate (% p.a.)</div>
                          <input
                            type="number"
                            step="0.01"
                            className="finput"
                            placeholder="e.g. 10.5"
                            value={curData.rate}
                            onChange={e => update('rate', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                      )}

                      <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(38,166,154,0.1)', color: 'var(--teal)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>03</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Employment & Stability</div>
                      </div>
                      <div>
                        <div className="flab">Employment Type</div>
                        <select className="fselect" value={curData.empType} onChange={e => update('empType', e.target.value)} disabled={isReadOnly}>
                          <option value="full">Full-time</option><option value="part">Part-time</option><option value="self">Self-employed</option><option value="unemployed">Unemployed</option>
                        </select>
                      </div>
                      <div>
                        <div className="flab">Months Employed</div>
                        <input type="number" className="finput" value={curData.empl} onChange={e => update('empl', +e.target.value)} disabled={isReadOnly} />
                      </div>
                      <div>
                        <div className="flab">Job Changes (Last 5 Years)</div>
                        <input type="number" className="finput" value={curData.jobChanges} onChange={e => update('jobChanges', +e.target.value)} disabled={isReadOnly} />
                      </div>

                      <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(232,84,117,0.1)', color: 'var(--rose)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>04</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--rose)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Risk Information</div>
                      </div>
                      <div>
                        <div className="flab">Has Mortgage?</div>
                        <div className="ftog">
                          <button className={`ftog-btn ${curFlags.mort === 'Y' ? 'on' : ''}`} onClick={() => tog('mort', 'Y')}>Yes</button>
                          <button className={`ftog-btn ${curFlags.mort === 'N' ? 'on' : ''}`} onClick={() => tog('mort', 'N')}>No</button>
                        </div>
                      </div>
                      <div>
                        <div className="flab">Has Dependents?</div>
                        <div className="ftog">
                          <button className={`ftog-btn ${curFlags.dep === 'Y' ? 'on' : ''}`} onClick={() => tog('dep', 'Y')}>Yes</button>
                          <button className={`ftog-btn ${curFlags.dep === 'N' ? 'on' : ''}`} onClick={() => tog('dep', 'N')}>No</button>
                        </div>
                      </div>
                      <div className="fg-full">
                        <div className="flab">Has Co-Signer?</div>
                        <div className="ftog">
                          <button className={`ftog-btn ${curFlags.co === 'Y' ? 'on' : ''}`} onClick={() => tog('co', 'Y')}>Yes</button>
                          <button className={`ftog-btn ${curFlags.co === 'N' ? 'on' : ''}`} onClick={() => tog('co', 'N')}>No</button>
                        </div>
                      </div>

                      <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'var(--navy-glow)', color: 'var(--navy)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>05</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Select Bank</div>
                      </div>
                      <div className="fg-full" style={{ gridColumn: '1 / -1' }}>
                        <div className="flab">Which Bank Are You Applying To? <span className="combo-tag">Required</span></div>
                        <div className="combo-field">
                          <select
                            className={`fselect ${curData.targetBank === '__custom__' ? 'has-manual' : ''}`}
                            value={curData.targetBank}
                            onChange={e => update('targetBank', e.target.value)}
                            disabled={isReadOnly}
                            style={{ padding: '14px 18px', borderRadius: '12px', background: '#fff', border: '1.5px solid var(--border)', fontSize: '14.5px', fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', transition: '0.2s' }}
                          >
                            <option value="">Select bank you are applying to…</option>
                            <option value="SBI">State Bank of India (SBI)</option>
                            <option value="HDFC Bank">HDFC Bank</option>
                            <option value="ICICI Bank">ICICI Bank</option>
                            <option value="Axis Bank">Axis Bank</option>
                            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                            <option value="PNB">Punjab National Bank (PNB)</option>
                            <option value="Bank of Baroda">Bank of Baroda</option>
                            <option value="Canara Bank">Canara Bank</option>
                            <option value="Union Bank">Union Bank of India</option>
                            <option value="IDFC First Bank">IDFC First Bank</option>
                            <option value="IndusInd Bank">IndusInd Bank</option>
                            <option value="__custom__">Other (Specify manually)</option>
                          </select>
                          {curData.targetBank === '__custom__' && (
                            <input
                              type="text"
                              className="combo-manual show"
                              placeholder="e.g. Saraswat Bank, DBS India, Federal Bank…"
                              value={curData.targetBankCustom}
                              onChange={e => update('targetBankCustom', e.target.value)}
                              disabled={isReadOnly}
                            />
                          )}
                        </div>
                        {/* Confirmation badge */}
                        {(curData.targetBank && curData.targetBank !== '__custom__') && (
                          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(75,168,224,0.08)', border: '1px solid rgba(75,168,224,0.2)', borderRadius: '8px', fontSize: '11px', color: 'var(--sky)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✅ Applying to: <strong>{curData.targetBank}</strong>
                          </div>
                        )}
                        {(curData.targetBank === '__custom__' && curData.targetBankCustom.trim()) && (
                          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(75,168,224,0.08)', border: '1px solid rgba(75,168,224,0.2)', borderRadius: '8px', fontSize: '11px', color: 'var(--sky)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✅ Applying to: <strong>{curData.targetBankCustom.trim()}</strong>
                          </div>
                        )}
                      </div>

                      <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(100,100,100,0.1)', color: 'var(--slate)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>06</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Existing Liabilities (Optional)</div>
                      </div>
                      <div className="fg-full">
                        <div className="flab">Active Loan at Another Bank?</div>
                        <div className="ftog">
                          <button className={`ftog-btn ${curFlags.extloan === 'Y' ? 'on' : ''}`} onClick={() => tog('extloan', 'Y')}>Yes</button>
                          <button className={`ftog-btn ${curFlags.extloan === 'N' ? 'on' : ''}`} onClick={() => tog('extloan', 'N')}>No</button>
                        </div>
                      </div>

                      {curFlags.extloan === 'Y' && (
                        <div style={{ gridColumn: '1/-1', background: 'rgba(232,84,117,0.06)', border: '1px solid rgba(232,84,117,0.18)', borderRadius: '12px', padding: '20px', marginTop: '4px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                          <div style={{ gridColumn: '1/-1', fontSize: '11px', color: 'var(--rose)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Existing Debt Burden Assessment</div>
                          <div>
                            <div className="flab">Outstanding Loan Amount (₹)</div>
                            <input type="number" className="finput" value={curData.extLoanAmt} onChange={e => update('extLoanAmt', +e.target.value)} disabled={isReadOnly} />
                          </div>
                          <div>
                            <div className="flab">Monthly EMI Being Paid (₹)</div>
                            <input type="number" className="finput" value={curData.extEmi} onChange={e => update('extEmi', +e.target.value)} disabled={isReadOnly} />
                          </div>
                          <div>
                            <div className="flab">Interest Rate (% p.a.)</div>
                            <input type="number" step="0.01" className="finput" placeholder="e.g. 10.5" value={curData.extRate || ''} onChange={e => update('extRate', e.target.value)} disabled={isReadOnly} />
                          </div>
                          <div>
                            <div className="flab">Bank Name <span className="combo-tag">+ Custom</span></div>
                            <div className="combo-field">
                              <select className="combo-select" value={curData.extBank} onChange={e => update('extBank', e.target.value)} disabled={isReadOnly}>
                                <option value="">Select bank...</option>
                                <option value="SBI">SBI</option>
                                <option value="HDFC Bank">HDFC Bank</option>
                                <option value="ICICI Bank">ICICI Bank</option>
                                <option value="Axis Bank">Axis Bank</option>
                                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                                <option value="PNB">Punjab National Bank</option>
                                <option value="Bank of Baroda">Bank of Baroda</option>
                                <option value="Canara Bank">Canara Bank</option>
                                <option value="Union Bank">Union Bank of India</option>
                                <option value="IDFC First Bank">IDFC First Bank</option>
                                <option value="IndusInd Bank">IndusInd Bank</option>
                                <option value="Yes Bank">Yes Bank</option>
                                <option value="custom">Enter manually...</option>
                              </select>
                              <input
                                className={`combo-manual ${curData.extBank === 'custom' ? 'show' : ''}`}
                                placeholder="Enter bank name..."
                                value={curData.extBankCustom || ''}
                                onChange={e => update('extBankCustom', e.target.value)}
                                disabled={isReadOnly}
                              />
                            </div>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <div className="flab">Loan Purpose <span className="combo-tag">+ Custom</span></div>
                            <div className="combo-field">
                              <select className="combo-select" value={curData.extLoanType} onChange={e => update('extLoanType', e.target.value)} disabled={isReadOnly}>
                                <option value="personal">Personal Loan</option>
                                <option value="home">Home Loan</option>
                                <option value="auto">Auto/Vehicle Loan</option>
                                <option value="education">Education Loan</option>
                                <option value="business">Business Loan</option>
                                <option value="gold">Gold Loan</option>
                                <option value="other">Other</option>
                                <option value="custom">Enter manually...</option>
                              </select>
                              <input
                                className={`combo-manual ${curData.extLoanType === 'custom' ? 'show' : ''}`}
                                placeholder="e.g. Agriculture Loan, LAP..."
                                value={curData.extLoanTypeCustom || ''}
                                onChange={e => update('extLoanTypeCustom', e.target.value)}
                              />
                            </div>
                          </div>
                          {(curData.extLoanAmt > 0 || curData.extEmi > 0) && (
                            <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: 'rgba(201,151,60,0.08)', border: '1px solid rgba(201,151,60,0.18)', borderRadius: '12px', fontSize: '13px', color: 'var(--text2)' }}>
                              <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px' }}>Risk Impact Assessment</div>
                              <div style={{ lineHeight: 1.8 }}>
                                <span style={{ color: 'var(--gold)' }}>● Existing EMI burden: <strong>₹{fmt(curData.extEmi)}/mo</strong> = {curData.income > 0 ? ((curData.extEmi / (curData.income / 12)) * 100).toFixed(1) : 0}% of your monthly income</span><br />
                                <span style={{ color: 'var(--text2)' }}>● DTI effectively increases by ~<strong>{curData.income > 0 ? ((curData.extEmi / (curData.income / 12))).toFixed(2) : 0}</strong> — model penalises higher DTI</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Identity Verification Section (Apply Only) */}
                      {page === 'bpg-apply' && !isReadOnly && (
                        <>
                          <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--ice)', color: 'var(--navy)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>07</div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Identity Verification</div>
                              <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '2px', fontWeight: 500 }}>Upload one government-approved ID for verification.</div>
                            </div>
                          </div>
                          
                          <div className="fg-full" style={{ gridColumn: '1 / -1' }}>
                            <div className="flab">Document Type <span className="combo-tag">Required</span></div>
                            <select className="fselect" value={idType} onChange={e => setIdType(e.target.value)}>
                              <option value="">Select Document Type</option>
                              <option value="aadhaar">Aadhaar Card</option>
                              <option value="pan">PAN Card</option>
                              <option value="passport">Passport</option>
                              <option value="driving">Driving License</option>
                              <option value="voter">Voter ID</option>
                            </select>
                          </div>
                          
                          {idType && (
                            <div className="fg-full" style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                              <div className="flab">Upload Document <span className="combo-tag">Required</span></div>
                              
                              <div style={{ border: '2px dashed var(--border-strong)', borderRadius: '12px', padding: '32px', textAlign: 'center', background: 'var(--bg2)', transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative' }}>
                                <input 
                                  type="file" 
                                  accept=".jpg,.jpeg,.png,.pdf" 
                                  onChange={e => { if(e.target.files && e.target.files[0]) setIdFile(e.target.files[0]); }} 
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                                {!idFile ? (
                                  <>
                                    <div style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--slate)' }}>+</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '4px' }}>Click or drag file to upload</div>
                                    <div style={{ fontSize: '12px', color: 'var(--slate)' }}>Upload clear front-side image or PDF (Max 5MB)</div>
                                  </>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' }}>✓</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-deep)' }}>{idFile.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 600, marginTop: '4px' }}>Document Uploaded</div>
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '8px', textAlign: 'center' }}>
                                Your document is securely used only for identity verification.
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Action Area */}
                      {!isReadOnly && page === 'bpg-simulator' && (
                        <>
                          <div style={{ gridColumn: '1/-1', marginTop: '12px', padding: '14px 20px', borderRadius: '12px', background: 'rgba(201,151,60,0.06)', border: '1px solid rgba(201,151,60,0.2)', fontSize: '13px', color: 'var(--text2)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '14px', fontWeight: 900 }}>!</span>
                            <span><strong style={{ color: 'var(--gold)' }}>Check Eligibility.</strong> Use this tool to quickly see your loan approval chance. This is not a formal application. To apply for a real loan, use <strong>Apply Loan</strong>.</span>
                          </div>
                          <div className="fg-full mt18" style={{ gridColumn: '1 / -1' }}>
                            <button className="btn-assess" onClick={handleSimulate}>
                              Check Approval Chance
                            </button>
                          </div>
                        </>
                      )}

                      {!isReadOnly && page === 'bpg-apply' && (
                        <div className="fg-full mt18" style={{ gridColumn: '1 / -1' }}>
                          {applyResult ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', background: 'var(--bg2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
                              <div className="h-serif" style={{ fontSize: '24px', color: 'var(--text)', marginBottom: '10px' }}>Application Sent Successfully</div>
                              <div style={{ fontSize: '14px' }}>Your request to <strong>{applyForm.targetBank === '__custom__' ? applyForm.targetBankCustom : applyForm.targetBank}</strong> is now <strong style={{ color: 'var(--gold)' }}>Pending</strong>.</div>
                              <button className="btn-assess" style={{ marginTop: '24px', width: 'auto', padding: '10px 24px' }} onClick={() => { setPage('bpg-history'); setApplyResult(null); }}>View My Applications</button>
                            </div>
                          ) : (
                            <>
                              <button className="btn-assess" onClick={handleOfficialApply} disabled={applySubmitting}>
                                {applySubmitting ? 'Sending Request...' : 'Send Request to Bank'}
                              </button>
                              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text3)' }}>
                                By submitting, you agree to allow the bank to run a formal risk assessment and assign an interest rate.
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 'bpg-simulator' && result && (
            <div className="fade-in" style={{ marginTop: '24px', color: 'var(--navy)' }}>
              {/* HERO SECTION */}
              <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600, fontFamily: "'Georgia', serif", color: 'var(--navy)' }}>Eligibility Report</h2>
                <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '6px', letterSpacing: '0.5px', fontWeight: 500 }}>
                  Assessed by GroundZero ML Intelligence · {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <span style={{ padding: '6px 12px', background: 'rgba(13, 148, 136, 0.08)', color: 'var(--teal)', borderRadius: '6px', fontSize: '10px', fontWeight: 800, border: '1px solid rgba(13, 148, 136, 0.15)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: 'var(--teal)', borderRadius: '2px' }} /> Likely Approved
                  </span>
                  <span style={{ padding: '6px 12px', background: 'rgba(14, 165, 233, 0.08)', color: 'var(--sky)', borderRadius: '6px', fontSize: '10px', fontWeight: 800, border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                    ₹{fmt(formData.loanAmt)} · {effectiveTerm} months · {displayPurpose}
                  </span>
                </div>
              </div>

              {/* TOP CARDS ROW */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', color: 'var(--navy)', fontSize: '14px', fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                    <span style={{ width: '8px', height: '8px', background: 'var(--teal)', borderRadius: '50%' }} /> Your Risk Score
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '80px', fontWeight: 800, color: 'var(--teal)', lineHeight: 1, fontFamily: "'Georgia', serif" }}>{result.pct}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '12px', fontWeight: 700 }}>Default Probability</div>
                    <div style={{ height: '6px', background: 'var(--bg)', borderRadius: '3px', marginTop: '40px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${result.pct}%`, background: 'var(--teal)' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--teal)', marginTop: '20px', fontWeight: 600 }}>Category: {result.level === 'low' ? 'Low (<30%)' : result.level === 'med' ? 'Medium (30-60%)' : 'High (>60%)'}</div>
                  </div>
                </div>

                <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', color: 'var(--navy)', fontSize: '14px', fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                    <span style={{ width: '8px', height: '8px', background: 'var(--sky)', borderRadius: '50%' }} /> Monthly EMI
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '80px', fontWeight: 800, color: 'var(--gold)', lineHeight: 1, fontFamily: "'Georgia', serif" }}>₹{fmt(result.sched.emi)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '12px', fontWeight: 600 }}>per month for {effectiveTerm} months</div>

                    {(() => {
                      const moIncome = formData.income / 12 || 1;
                      const ratio = ((result.sched.emi + (result.extEmi || 0)) / moIncome * 100).toFixed(1);
                      return (
                        <div style={{ marginTop: '40px', fontSize: '13px', fontWeight: 700, color: 'var(--teal)' }}>
                          {ratio}% of monthly income
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* REPAYMENT BREAKDOWN SECTION */}
              <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', padding: '32px', borderRadius: '16px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', color: 'var(--navy)', fontSize: '14px', fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--sky)', borderRadius: '50%' }} /> Your Repayment Breakdown
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                  <div style={{ background: 'var(--bg)', padding: '32px 24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--teal)', fontFamily: "'Georgia', serif" }}>₹{fmt(formData.loanAmt)}</div>
                    <div style={{ fontSize: '9px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '8px', fontWeight: 800 }}>Principal</div>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: '32px 24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--rose)', fontFamily: "'Georgia', serif" }}>₹{fmt(result.sched.tI)}</div>
                    <div style={{ fontSize: '9px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '8px', fontWeight: 800 }}>Total Interest</div>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: '32px 24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--gold)', fontFamily: "'Georgia', serif" }}>₹{fmt(result.sched.tPay)}</div>
                    <div style={{ fontSize: '9px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '8px', fontWeight: 800 }}>Total Repayment</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: 'var(--sky)', borderRadius: '2px' }} /> Principal {Math.round((formData.loanAmt / result.sched.tPay) * 100)}%</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: 'var(--rose)', borderRadius: '2px' }} /> Interest {Math.round((result.sched.tI / result.sched.tPay) * 100)}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '40px' }}>
                  <div style={{ width: `${(formData.loanAmt / result.sched.tPay) * 100}%`, background: 'var(--sky)' }} />
                  <div style={{ width: `${(result.sched.tI / result.sched.tPay) * 100}%`, background: 'var(--rose)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
                    <span style={{ color: 'var(--slate)', fontSize: '14px' }}>Rate (indicative)</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)' }}>{formData.rate}% p.a.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
                    <span style={{ color: 'var(--slate)', fontSize: '14px' }}>Term</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)' }}>{effectiveTerm} months ({displayPurpose})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--slate)', fontSize: '14px' }}>Loan / Annual Income</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)' }}>{formData.income > 0 ? (formData.loanAmt / formData.income).toFixed(2) : 0}x</span>
                  </div>
                </div>
              </div>

              {/* AMORTIZATION SECTION */}
              <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--navy)', fontSize: '15px', fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                    <span style={{ width: '8px', height: '8px', background: 'var(--sky)', borderRadius: '50%' }} /> Full Amortization Schedule
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Month-by-month repayment</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800 }}>Month</th>
                        <th style={{ textAlign: 'right', padding: '16px 0', fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800 }}>EMI</th>
                        <th style={{ textAlign: 'right', padding: '16px 0', fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800 }}>Principal</th>
                        <th style={{ textAlign: 'right', padding: '16px 0', fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800 }}>Interest</th>
                        <th style={{ textAlign: 'right', padding: '16px 0', fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800 }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sched.rows.slice(0, expandSched ? undefined : 12).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '18px 0', fontSize: '13px', color: 'var(--slate)', fontWeight: 600 }}>Mo {r.m}</td>
                          <td style={{ padding: '18px 0', textAlign: 'right', fontSize: '14px', fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>₹{fmt(r.emi)}</td>
                          <td style={{ padding: '18px 0', textAlign: 'right', fontSize: '14px', color: 'var(--slate)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>₹{fmt(r.p)}</td>
                          <td style={{ padding: '18px 0', textAlign: 'right', fontSize: '14px', color: 'var(--rose)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>₹{fmt(r.i)}</td>
                          <td style={{ padding: '18px 0', textAlign: 'right', fontSize: '14px', color: 'var(--gold)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>₹{fmt(r.bal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!expandSched && result.sched.rows.length > 12 && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <button onClick={() => setExpandSched(true)} style={{ background: 'none', border: 'none', color: 'var(--sky)', fontSize: '12px', fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
                        ... and {result.sched.rows.length - 12} more months.
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {page === 'bpg-history' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h1 className="h-serif" style={{ fontSize: '32px' }}>My <span style={{ color: 'var(--sky)' }}>Applications</span></h1>
                  <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>Track your loan applications and approval status.</p>
                </div>
                <div className="segmented-control">
                  <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All Records</button>
                  <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>Under Review</button>
                </div>
              </div>

              <div className="analyst-table-container">
                <table className="analyst-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '32px' }}>Submission Date</th>
                      <th>Target Institution</th>
                      <th>Principal (₹)</th>
                      <th>Term</th>
                      <th>Status</th>
                      <th>Int. Rate</th>
                      <th style={{ textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApps.filter(a => activeTab === 'all' || a.status.toLowerCase().includes(activeTab)).map(app => (
                      <tr key={app.id}>
                        <td style={{ paddingLeft: '32px', color: 'var(--slate)', fontSize: '13px', fontWeight: 600 }}>
                          {new Date(app.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--navy-deep)' }}>{app.target_bank}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--navy)' }}>{fmt(app.loan_amount)}</td>
                        <td style={{ fontWeight: 600 }}>{app.term} Months</td>
                        <td>
                          <span className={`mock-status ${app.status === 'Approved' ? 's-ok' : app.status === 'Rejected' ? 's-err' : 's-wait'}`}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--sky)' }}>
                          {app.assigned_rate || app.interest_rate ? `${app.assigned_rate || app.interest_rate}%` : '--'}
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                          <button className="lp-btn-solid" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '6px' }} onClick={() => handleViewApp(app)}>
                            VIEW DETAILS
                          </button>
                        </td>
                      </tr>
                    ))}
                    {myApps.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ padding: '80px', textAlign: 'center' }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>📂</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-deep)' }}>No Institutional Records Found</div>
                          <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>Submit your first official application to initialize your credit history.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {page === 'bpg-stocks' && (
            <div className="fade-in">
              <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h1 className="h-serif" style={{ fontSize: '32px' }}>Money <span style={{ color: 'var(--gold)' }}>Insights</span></h1>
                  <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>View simple financial suggestions based on your profile.</p>
                </div>
                <div className="segmented-control">
                  <button className="active">Advisory Terminal</button>
                  <button>Portfolio Review</button>
                </div>

              </div>

              <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="kpi-card">
                  <div className="label">Bitcoin (BTC)</div>
                  <div className="value" style={{ color: 'var(--navy-deep)' }}>
                    {liveData.loading ? '...' : liveData.btc ? `₹${fmtK(liveData.btc.inr)}` : '₹55.4L'}
                  </div>
                  <div className={`trend ${liveData.btc?.inr_24h_change < 0 ? 'down' : 'up'}`} style={{ color: liveData.btc?.inr_24h_change < 0 ? 'var(--rose)' : 'var(--teal)', fontSize: '11px', fontWeight: 800 }}>
                    {liveData.btc?.inr_24h_change < 0 ? '▼' : '▲'} {Math.abs(liveData.btc?.inr_24h_change || 1.2).toFixed(2)}% <span style={{ color: 'var(--slate-light)', fontWeight: 400 }}>24h</span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="label">Nifty 50 Index</div>
                  <div className="value">24,320</div>
                  <div className="trend up" style={{ color: 'var(--teal)', fontSize: '11px', fontWeight: 800 }}>▲ 0.65% <span style={{ color: 'var(--slate-light)', fontWeight: 400 }}>Today</span></div>
                </div>
                <div className="kpi-card">
                  <div className="label">Money Health</div>
                  <div className="value" style={{ color: activeProfile?.level === 'low' ? 'var(--teal)' : 'var(--gold)' }}>{activeProfile?.level === 'low' ? 'Optimal' : 'Moderate'}</div>
                  <div className="label" style={{ fontSize: '10px' }}>Your Score</div>
                </div>
                <div className="kpi-card">
                  <div className="label">Suggested Options</div>
                  <div className="value">06</div>
                  <div className="label" style={{ fontSize: '10px' }}>Top Picks</div>
                </div>
              </div>

              {!activeProfile ? (
                <div className="card" style={{ textAlign: 'center', padding: '100px 40px', color: 'var(--slate)' }}>
                  <div style={{ fontSize: '56px', marginBottom: '24px' }}>🔒</div>
                  <h3 className="h-serif" style={{ color: 'var(--navy-deep)', marginBottom: '12px' }}>Money Insights Locked</h3>
                  <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '15px', lineHeight: 1.6 }}>Please check your eligibility or apply for a loan first to see financial suggestions tailored for you.</p>
                  <button className="lp-btn-solid" style={{ marginTop: '32px', padding: '14px 32px' }} onClick={() => setPage('bpg-simulator')}>Check Eligibility</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div className="card" style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                          <h3 style={{ fontSize: '18px', color: 'var(--navy-deep)', margin: 0 }}>Market Prices</h3>
                          <div style={{ fontSize: '12px', color: 'var(--slate)', marginTop: '4px' }}>Current Focus: <strong style={{ color: 'var(--sky)' }}>{selectedAsset || 'Select an option below'}</strong></div>
                        </div>
                        <div className="range-selector">
                          {['1D', '1W', '1M', '1Y'].map(r => (
                            <button key={r} className={`range-btn ${r === '1W' ? 'active' : ''}`}>{r}</button>
                          ))}
                        </div>
                      </div>

                      <div className="chart-container" style={{ height: '300px', overflow: 'hidden' }}>
                        {selectedAsset ? (
                          <>
                            <div className="chart-tooltip" style={{ top: '24px', right: '24px' }}>
                              <span>Safety Check</span>
                              <div>{selectedAsset === 'BTC' ? 'High Risk' : selectedAsset === 'NIFTY' ? 'Moderate' : 'Safe/Institutional'}</div>
                            </div>
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                              <defs>
                                <linearGradient id="wealthGrad" x1="0" x2="0" y1="0" y2="1">
                                  <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.15" />
                                  <stop offset="100%" stopColor="var(--sky)" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {(() => {
                                const pts = generateSvgPath(selectedAsset);
                                const pathStr = `M ${pts.join(' L ')}`;
                                const areaStr = `${pathStr} L 100,100 L 0,100 Z`;
                                return (
                                  <>
                                    <path d={areaStr} fill="url(#wealthGrad)" style={{ transition: 'all 1s cubic-bezier(0.23, 1, 0.32, 1)' }} />
                                    <path d={pathStr} fill="none" stroke="var(--sky)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 1s cubic-bezier(0.23, 1, 0.32, 1)' }} />
                                    {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="6,6" />)}
                                    <circle cx="100" cy={pts[pts.length - 1].split(',')[1]} r="5" fill="var(--sky)" stroke="#fff" strokeWidth="2.5" />
                                  </>
                                );
                              })()}
                            </svg>
                          </>
                        ) : (
                          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', opacity: 0.6 }}>
                            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📈</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Select an Option</div>
                            <p style={{ fontSize: '12px' }}>Click on a suggestion below to see the price trend.</p>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        {[
                          { id: 'BTC', name: 'Digital Alpha', type: 'High Risk', label: 'BTC', price: liveData.btc ? `₹${fmt(liveData.btc.inr)}` : '₹55,42,100', trend: '+1.2%', up: true },
                          { id: 'RELIANCE', name: 'Corporate Equity', type: 'Core Growth', label: 'RELIANCE', price: '₹2,941', trend: '+0.82%', up: true },
                          { id: 'SGB', name: 'Sovereign Debt', type: 'Stable', label: 'GOLD BOND', price: '₹6,240', trend: '+0.15%', up: true },
                          { id: 'NIFTY', name: 'Market Index', type: 'Broad Market', label: 'NIFTY 50', price: '₹24,320', trend: '+0.45%', up: true },
                          { id: 'FD', name: 'Liquid Reserves', type: 'Fixed Rate', label: 'FIXED DEPOSIT', price: '7.10%', trend: 'Stable', up: true },
                          { id: 'MF', name: 'Diversified Fund', type: 'Managed', label: 'BLUECHIP MF', price: '₹142.1', trend: '+1.1%', up: true }
                        ].filter(a => {
                          if (activeProfile.level === 'high') return ['SGB', 'FD', 'MF'].includes(a.id);
                          if (activeProfile.level === 'med') return ['RELIANCE', 'SGB', 'NIFTY', 'MF'].includes(a.id);
                          return true;
                        }).map(asset => (
                          <div key={asset.id} className={`market-card ${selectedAsset === asset.id ? 'active' : ''}`} onClick={() => setSelectedAsset(asset.id)} style={{ border: selectedAsset === asset.id ? '2px solid var(--sky)' : '1px solid var(--border)', background: selectedAsset === asset.id ? 'rgba(14, 165, 233, 0.02)' : '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              <span>{asset.type}</span>
                              <span style={{ color: asset.up ? 'var(--teal)' : 'var(--rose)' }}>{asset.trend}</span>
                            </div>
                            <div style={{ fontWeight: 800, color: 'var(--navy-deep)', marginTop: '6px', fontSize: '15px' }}>{asset.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--slate)', opacity: 0.8 }}>{asset.label}</div>
                            <div className="price" style={{ fontSize: '20px', marginTop: '12px', color: 'var(--navy-deep)' }}>{asset.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card" style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', color: 'var(--navy-deep)', margin: 0 }}>Portfolio Suggestions</h3>
                        <span className="mock-status s-ok" style={{ fontSize: '9px' }}>AI OPTIMIZED</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {activeProfile.level === 'low' ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ width: '48px', height: '48px', background: 'var(--sky-light)', color: 'var(--sky)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>65%</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-deep)' }}>Growth Investments</div>
                                  <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 600 }}>High Return Opportunity</div>
                                </div>
                                <div style={{ height: '8px', background: 'var(--ice)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '65%', height: '100%', background: 'var(--sky)', borderRadius: '4px' }} /></div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ width: '48px', height: '48px', background: 'var(--teal-light)', color: 'var(--teal)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>25%</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-deep)' }}>Stable Debt</div>
                                  <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 600 }}>Safety Layer</div>
                                </div>
                                <div style={{ height: '8px', background: 'var(--ice)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '25%', height: '100%', background: 'var(--teal)', borderRadius: '4px' }} /></div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ width: '48px', height: '48px', background: 'var(--rose-light)', color: 'var(--rose)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>10%</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-deep)' }}>Frontier Assets</div>
                                  <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 600 }}>New Opportunities</div>
                                </div>
                                <div style={{ height: '8px', background: 'var(--ice)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '10%', height: '100%', background: 'var(--rose)', borderRadius: '4px' }} /></div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{ background: 'var(--ice)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '8px' }}>Safe Capital Planning</div>
                            <p style={{ fontSize: '13px', color: 'var(--slate)', lineHeight: 1.7 }}>
                              Given your current debt level ({(activeProfile.dti * 100).toFixed(1)}%), it is better to prioritize safety. Recommended allocation: 70% Fixed Deposits / 30% Gold.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div className="card" style={{ background: 'var(--navy-deep)', color: '#fff', border: 'none', padding: '40px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Smart Summary</div>
                      <h3 className="h-serif" style={{ fontSize: '24px', color: '#fff', marginBottom: '20px' }}>Financial Advisory</h3>
                      <p style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.8, marginBottom: '32px' }}>
                        {activeProfile.level === 'low'
                          ? 'Your financial profile is very stable. You have good capacity for growth-focused investments like tech stocks. We recommend exploring diversified equity options.'
                          : 'Safety is currently the best strategy. While your profile is resilient, we recommend keeping debt below 30% of your income before entering risky markets.'
                        }
                      </p>
                      <div style={{ padding: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--teal)' }}>●</span> Core Goal: Value Growth
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.6, lineHeight: 1.6 }}>Focus on dividend-paying assets to build a secondary income stream.</div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', color: 'var(--navy-deep)', margin: 0 }}>Market Updates</h3>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--gold)', letterSpacing: '1px' }}>LATEST NEWS</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {[
                          { title: 'Global Gold Market Outlook', date: 'Oct 2024', source: 'Gold News', type: 'GOLD' },
                          { title: 'Stock Market Growth Cycles', date: 'Oct 2024', source: 'Market Research', type: 'EQUITY' },
                          { title: 'FD and Interest Rate Benefits', date: 'Sep 2024', source: 'Savings Advisor', type: 'SAVINGS' }
                        ].map((news, i) => (
                          <div key={i} style={{ paddingBottom: '20px', borderBottom: i === 2 ? '' : '1px solid var(--ice)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span className="mock-status s-wait" style={{ fontSize: '9px' }}>{news.type}</span>
                              <span style={{ fontSize: '11px', color: 'var(--slate-light)', fontWeight: 600 }}>{news.date}</span>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-deep)', cursor: 'pointer', lineHeight: 1.4 }}>{news.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '4px', fontWeight: 600 }}>Source: {news.source}</div>
                          </div>
                        ))}
                      </div>
                      <button className="lp-btn-secondary" style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '12px' }}>VIEW FULL MARKET DATA</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {page === 'bpg-tips' && (
            <div className="fade-in">
              <div className="card glass mb18" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                <div style={{ background: 'linear-gradient(to right, var(--teal), #1d8a7a)', padding: '24px 32px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Smart Advisory</div>
                    <h2 style={{ margin: '0', fontSize: '22px', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>Smart Tips</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 10px #4ade80' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>AI ENGINE OPTIMIZED</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '20px 32px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>
                    Helpful suggestions to improve your financial profile and loan eligibility.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { lbl: 'Credit Score Optimization', val: 'Model coef: −0.121. Maintaining a score of 700+ reduces default probability by 22% compared to sub-500 scores.', num: '01' },
                  { lbl: 'Income-to-Loan Proportion', val: 'Loan_Income_Ratio coef: +0.470. Maintaining a loan principal below 1.5× annual gross income is recommended for approval.', num: '02' },
                  { lbl: 'Interest Rate Management', val: 'InterestRate coef: +0.459. Lower rates significantly improve repayment sustainability scores in the current model.', num: '03' },
                  { lbl: 'Professional Tenure Stability', val: 'MonthsEmployed coef: -0.339. The underwriting engine prioritizes borrowers with 48+ months of continuous employment.', num: '04' },
                  { lbl: 'Co-Signer Risk Mitigation', val: 'HasCoSigner_Yes coef: -0.142. Adding a guarantor with a healthy credit profile reduces system-calculated risk by 14%.', num: '05' },
                  { lbl: 'Strategic Loan Purpose', val: 'LoanPurpose_Home coef: -0.078. Mortgage-backed facilities represent the lowest risk asset class for institutional lenders.', num: '06' }
                ].map((tip, idx) => (
                  <div key={idx} className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '24px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ background: 'var(--navy)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '14px', fontWeight: 800, color: 'var(--gold)', flexShrink: 0 }}>{tip.num}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '4px', fontSize: '15px' }}>{tip.lbl}</div>
                      <div style={{ color: 'var(--slate)', fontSize: '13px', lineHeight: '1.6' }}>{tip.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <button className="ai-fab" onClick={() => setIsAiOpen(!isAiOpen)}>
        <span style={{ fontSize: '18px', fontWeight: 900 }}>AI</span>
      </button>
      <ArthaAI isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}

const ApplicationSummaryView = ({ data, flags, result, onBack, showAdvanced, setShowAdvanced }) => {
  const [paidMonths, setPaidMonths] = useState([]);
  const togglePaid = (m) => setPaidMonths(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m].sort((a, b) => a - b));

  const eduMap = { hs: "High School", bach: "Bachelor's", mast: "Master's", phd: "PhD" };
  const empMap = { full: "Full-time", part: "Part-time", self: "Self-employed", unemployed: "Unemployed" };
  const maritalMap = { single: "Single", married: "Married", divorced: "Divorced" };
  const purposeMap = { home: "Home", auto: "Auto", education: "Education", business: "Business", medical: "Medical", personal: "Personal Loan", other: "Other", custom: "Other" };

  const displayPurpose = data.purpose === 'custom' ? data.customPurpose : (purposeMap[data.purpose] || data.purpose);
  const effectiveTerm = data.term === 'custom' ? data.customTerm : data.term;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="h-serif" style={{ fontSize: '32px', margin: 0 }}>Loan <span style={{ color: 'var(--gold)' }}>Details</span></h1>
          <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>View your loan summary and monthly payment plan.</p>
        </div>
        <button onClick={onBack} className="lp-btn-secondary" style={{ padding: '10px 24px', width: 'auto' }}>
          ← BACK TO MY APPLICATIONS
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="kpi-card">
          <div className="label">Status</div>
          <div className="value" style={{ color: result.adjustedD.status === 'Approved' ? 'var(--teal)' : result.adjustedD.status === 'Rejected' ? 'var(--rose)' : 'var(--gold)' }}>
            {result.adjustedD.status || 'Under Review'}
          </div>
          <div className="label" style={{ fontSize: '10px' }}>Current Application Stage</div>
        </div>
        <div className="kpi-card">
          <div className="label">Interest Rate</div>
          <div className="value" style={{ color: 'var(--sky)' }}>{result.adjustedD.assigned_rate || result.adjustedD.interest_rate || '0.0'}%</div>
          <div className="label" style={{ fontSize: '10px' }}>Fixed Yearly Rate</div>
        </div>
        <div className="kpi-card">
          <div className="label">Risk Probability</div>
          <div className="value" style={{ color: result.level === 'low' ? 'var(--teal)' : 'var(--rose)' }}>{result.pct}%</div>
          <div className="label" style={{ fontSize: '10px' }}>Calculated Risk Score</div>
        </div>
        <div className="kpi-card">
          <div className="label">Monthly Payment</div>
          <div className="value">₹{fmt(result.sched.emi)}</div>
          <div className="label" style={{ fontSize: '10px' }}>Monthly EMI Amount</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--navy-deep)', marginBottom: '24px' }}>Loan Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { l: 'Loan Amount', v: `₹${fmt(data.loanAmt)}` },
              { l: 'Reason for Loan', v: displayPurpose },
              { l: 'Repayment Time', v: `${effectiveTerm} Months` },
              { l: 'Monthly Debt vs Income', v: `${(data.dti * 100).toFixed(1)}%` },
              { l: 'Credit Score', v: data.credit },
              { l: 'Job Type', v: empMap[data.empType] },
              { l: 'Safety Rating', v: result.level === 'low' ? 'SAFE' : result.level === 'med' ? 'MODERATE' : 'HIGH RISK' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--ice)', fontSize: '14px' }}>
                <span style={{ color: 'var(--slate)', fontWeight: 600 }}>{item.l}</span>
                <span style={{ color: 'var(--navy-deep)', fontWeight: 800 }}>{item.v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', padding: '24px', background: 'var(--ice)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Bank Reviewer Notes</div>
            <p style={{ fontSize: '13px', color: 'var(--navy-deep)', lineHeight: 1.7, opacity: 0.9, fontWeight: 500 }}>
              {result.level === 'low' ? 'Your profile looks very strong. You have a stable income and low debt, which makes you a safe borrower.' : 'The bank is checking your application carefully due to existing debt levels. They may ask for more documents soon.'}
            </p>
          </div>
        </div>

        <div className="analyst-table-container">
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--navy-deep)', margin: 0 }}>Amortization Lifecycle</h3>
            <span className="mbadge mbadge-sky" style={{ fontSize: '10px' }}>LIFECYCLE ACTIVE</span>
          </div>
          <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
            <table className="analyst-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '32px' }}>Period</th>
                  <th>EMI Amount</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                  <th style={{ textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.sched.rows.map(row => {
                  const isPaid = paidMonths.includes(row.m);
                  return (
                    <tr key={row.m}>
                      <td style={{ paddingLeft: '32px', fontWeight: 800, color: 'var(--navy-deep)' }}>Month {row.m}</td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--navy)' }}>₹{fmt(row.emi)}</td>
                      <td style={{ color: 'var(--sky)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{fmt(row.p)}</td>
                      <td style={{ color: 'var(--rose)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{fmt(row.i)}</td>
                      <td style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--navy-deep)' }}>₹{fmt(row.bal)}</td>
                      <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                        <button onClick={() => togglePaid(row.m)} className="lp-btn-solid" style={{ fontSize: '10px', padding: '6px 12px', background: isPaid ? 'var(--teal)' : 'var(--navy)', width: 'auto', borderRadius: '6px' }}>
                          {isPaid ? '✓ PAID' : 'MARK PAID'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
