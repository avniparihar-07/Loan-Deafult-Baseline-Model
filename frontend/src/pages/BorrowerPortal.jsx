import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ArthaAI from '../components/ArthaAI';
import { calcRisk, calibrateProbability, buildSched, fmt, fmtK } from '../utils/model';
import { apiUrl } from '../services/api';

const DocCard = ({ label, id, file, onUpload, accept = ".jpg,.jpeg,.png,.pdf" }) => {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid var(--border)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      position: 'relative',
      minHeight: '160px'
    }} className="doc-card-hover">
      <input
        type="file"
        accept={accept}
        onChange={e => { if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]); }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
      />
      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{label}</div>

      {!file ? (
        <div style={{ padding: '20px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '20px', color: 'var(--slate)', marginBottom: '8px' }}>📁</div>
          <div style={{ fontSize: '12px', color: 'var(--slate)', fontWeight: 600 }}>Click to Upload</div>
          <div style={{ fontSize: '10px', color: 'var(--slate)', opacity: 0.6, marginTop: '4px' }}>Max 5MB</div>
        </div>
      ) : (
        <div style={{ padding: '12px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', margin: '0 auto 10px' }}>✓</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy-deep)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{file.name}</div>
          <div style={{ fontSize: '10px', color: 'var(--teal)', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase' }}>Uploaded</div>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '12px', width: '100%', borderTop: '1px solid var(--ice)', display: 'flex', justifyContent: 'center' }}>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 800,
          textTransform: 'uppercase',
          background: file ? 'rgba(56,201,176,0.1)' : 'rgba(100,100,100,0.05)',
          color: file ? 'var(--teal)' : 'var(--slate)'
        }}>
          {file ? 'Uploaded' : 'Missing'}
        </span>
      </div>
    </div>
  );
};

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
    age: '', credit: '', income: '', loanAmt: '', purpose: 'home', customPurpose: '', term: 24, customTerm: '',
    empType: 'full', empl: '', jobChanges: '', edu: 'bach', marital: 'married',
    state: '', dtiDebt: '', dtiIncome: '', dti: '', lines: '',
    targetBank: '', targetBankCustom: ''
  });
  const [applyFlags, setApplyFlags] = useState({ mort: 'N', dep: 'N', co: 'N', extloan: 'N' });
  const [applyResult, setApplyResult] = useState(null); // { id, status }
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [selectedIdType, setSelectedIdType] = useState('aadhaar');
  const [docs, setDocs] = useState({
    idFront: null, idBack: null,
    addressProof: null,
    salarySlip: null, bankStatement: null,
    selfie: null, empId: null, coApplicant: null
  });
  const [viewForm, setViewForm] = useState(null);
  const [viewFlags, setViewFlags] = useState(null);
  const [behData, setBehData] = useState(null);
  const resultRef = useRef(null);
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

  const [ageError, setAgeError] = useState('');

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

    if (k === 'age') {
      const val = v.toString();
      if (val === '') {
        setAgeError('Please enter your age.');
      } else if (val.includes('.') || val.includes('e') || val.includes('E')) {
        setAgeError('Age must be a whole number.');
      } else {
        const num = parseInt(val);
        if (num < 0) {
          setAgeError('Age cannot be negative.');
        } else if (num < 18) {
          setAgeError('You must be at least 18 years old to apply for a loan.');
        } else {
          setAgeError('');
        }
      }
    }

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
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

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
    const isCustomPurp = !stdPurposes.includes((app.loan_purpose || '').toLowerCase());

    setViewForm({
      age: app.age, credit: app.credit_score, income: app.income, loanAmt: app.loan_amount,
      dti: app.dti, lines: app.num_credit_lines,
      purpose: isCustomPurp ? 'custom' : (app.loan_purpose?.toLowerCase() || 'other'),
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
      targetBank: app.target_bank, targetBankCustom: '',
      loan_id: app.loan_id
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
    setApplyForm({
      age: '', credit: '', income: '', loanAmt: '', purpose: 'home', customPurpose: '', term: 24, customTerm: '',
      empType: 'full', empl: '', jobChanges: '', edu: 'bach', marital: 'married',
      state: '', dtiDebt: '', dtiIncome: '', dti: '', lines: '',
      targetBank: '', targetBankCustom: ''
    });
    setApplyFlags({ mort: 'N', dep: 'N', co: 'N', extloan: 'N' });
    setViewForm(null);
    setViewFlags(null);
    setDraftData(null);
    setDraftFlags(null);
    setDraftResult(null);
    setSelectedIdType('aadhaar');
    setDocs({
      idFront: null, idBack: null,
      addressProof: null,
      salarySlip: null, bankStatement: null,
      selfie: null, empId: null, coApplicant: null
    });
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
    const requiredFields = ['age', 'income', 'loanAmt', 'empl', 'jobChanges', 'credit'];
    const missing = requiredFields.filter(key => applyForm[key] === '' || applyForm[key] === null || (key !== 'dti' && key !== 'lines' && Number.isNaN(Number(applyForm[key]))));

    if (missing.length > 0) {
      alert('Please fill all required fields before submitting.');
      return;
    }
    if (!targetBankFinal) { alert('Please select the bank you are applying to.'); return; }
    if (!docs.idFront) { alert('Please upload the front of your identity document.'); return; }
    if (selectedIdType !== 'pan' && !docs.idBack) { alert('Please upload the back of your identity document.'); return; }

    setApplySubmitting(true);
    // Ensure DTI is stored as a valid decimal (0-1 range).
    const safeDti = Math.max(0, Math.min(parseFloat(applyForm.dti) || 0, 0.99));
    // Ensure jobChanges is sent as a proper integer (not string or empty)
    const safeJobChanges = parseInt(applyForm.jobChanges, 10);
    const finalJobChanges = Number.isNaN(safeJobChanges) ? 0 : safeJobChanges;
    // Purpose: always use the actual form key, map to human-readable label
    const loanPurposeFull = {
      home: 'Home', auto: 'Auto', education: 'Education', business: 'Business',
      medical: 'Medical', personal: 'Personal', travel: 'Travel'
    };
    const rawPurposeKey = applyForm.purpose; // e.g. 'home', 'auto'
    const storedPurpose = loanPurposeFull[rawPurposeKey] || 'Personal';
    const payload = {
      FullName: `${user?.first} ${user?.last}`.trim(),
      Email: user?.email,
      Age: parseInt(applyForm.age, 10) || 25,
      Income: parseFloat(applyForm.income) || 0,
      LoanAmount: parseFloat(applyForm.loanAmt) || 0,
      CreditScore: parseInt(applyForm.credit, 10) || 0,
      MonthsEmployed: parseInt(applyForm.empl, 10) || 0,
      NumCreditLines: parseInt(applyForm.lines, 10) || 1,
      LoanTerm: effectiveTerm2,
      DTIRatio: safeDti,
      Education: eduMap2[applyForm.edu] || "Bachelor's",
      EmploymentType: empMap2[applyForm.empType] || 'Full-time',
      MaritalStatus: marMap2[applyForm.marital] || 'Single',
      HasMortgage: applyFlags.mort === 'Y' ? 'Yes' : 'No',
      HasDependents: applyFlags.dep === 'Y' ? 'Yes' : 'No',
      LoanPurpose: storedPurpose,
      HasCoSigner: applyFlags.co === 'Y' ? 'Yes' : 'No',
      HasExistingLoan: applyFlags.extloan === 'Y' ? 'Yes' : 'No',
      JobChanges: finalJobChanges,
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
      ['income', 'Annual Income'],
      ['loanAmt', 'Loan Amount'],
      ['credit', 'Credit Score'],
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

      const rawProb = apiResult.default_probability / 100; // API returns 0-100
      const sched = buildSched(formData.loanAmt, formData.rate, effectiveTerm);
      
      // Apply Underwriting Calibration (Sanity Check for Demo)
      const prob = calibrateProbability(rawProb, formData);

      const pct = Math.round(prob * 100);
      const level = prob < 0.31 ? 'low' : prob < 0.61 ? 'med' : 'high';
      
      const probWithout = hasExtLoan ? calcRisk(formData, { mort: flags.mort, dep: flags.dep, co: flags.co }) : null;
      const pctWithout = probWithout ? Math.round(probWithout * 100) : null;
      const riskDelta = hasExtLoan ? (pct - pctWithout) : 0;

      setResult({ pct, level, sched, prob, hasExtLoan, extAmt, extEmi, pctWithout, riskDelta, adjustedD });
      setPage('bpg-simulator');
    } catch (err) {
      console.warn('[GroundZero] API unreachable, using local model fallback:', err);
      const rawProb = calcRisk(adjustedD, { mort: flags.mort === 'Y' || (hasExtLoan && formData.extLoanType === 'home') ? 'Y' : 'N', dep: flags.dep, co: flags.co });
      const sched = buildSched(formData.loanAmt, formData.rate, effectiveTerm);

      // Apply Underwriting Calibration (Sanity Check for Demo)
      const prob = calibrateProbability(rawProb, formData);

      const pct = Math.round(prob * 100);
      const level = prob < 0.31 ? 'low' : prob < 0.61 ? 'med' : 'high';
      
      const probWithout = hasExtLoan ? calcRisk(formData, { mort: flags.mort, dep: flags.dep, co: flags.co }) : null;
      const pctWithout = probWithout ? Math.round(probWithout * 100) : null;
      const riskDelta = hasExtLoan ? (pct - pctWithout) : 0;
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
                        <input
                          type="number"
                          className={`finput ${ageError ? 'error' : ''}`}
                          value={curData.age}
                          onChange={e => update('age', e.target.value)}
                          onKeyDown={e => {
                            if (['.', 'e', 'E', '+', '-'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          disabled={isReadOnly}
                          placeholder="e.g. 25"
                        />
                        {ageError && (
                          <div style={{
                            color: 'var(--rose)',
                            fontSize: '11px',
                            fontWeight: 600,
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ fontSize: '12px' }}>⚠</span> {ageError}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flab">Credit Score</div>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="finput" 
                          value={curData.credit} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            update('credit', val);
                          }} 
                          disabled={isReadOnly} 
                          placeholder="e.g. 750"
                        />
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
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="finput" 
                          value={curData.income} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            update('income', val);
                          }} 
                          disabled={isReadOnly} 
                          placeholder="e.g. 800000"
                        />
                      </div>
                      <div>
                        <div className="flab">Loan Amount (₹)</div>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="finput" 
                          value={curData.loanAmt} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            update('loanAmt', val);
                          }} 
                          disabled={isReadOnly} 
                          placeholder="e.g. 500000"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: curData.income > 0 ? 1 : 0.4 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '8px' }}>Income Stability</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)' }}>₹{fmt(curData.income / 12)}</span>
                          <span style={{ fontSize: '10px', color: 'var(--slate)', fontWeight: 600 }}>/ month</span>
                        </div>
                      </div>
                      <div className="fg-full" style={{ gridColumn: '1 / -1', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                        <div className="flab" style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>DTI — <span style={{ fontWeight: 400, color: 'var(--text2)' }}>Debt-to-Income Ratio (% of income used for EMI)</span> <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '11px', marginLeft: '8px' }}>(Optional)</span></span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 400, marginBottom: '12px' }}>What % of your monthly income goes toward loan repayments?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div className="flab">Monthly Debt (₹) <span className="combo-tag">Auto-DTI</span></div>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className="finput" 
                              value={curData.dtiDebt} 
                              onChange={e => {
                                const debt = e.target.value.replace(/\D/g, '');
                                const inc = curData.dtiIncome || curData.income;
                                update('dtiDebt', debt);
                                const dNum = (debt === '') ? 0 : parseFloat(debt);
                                const iNum = (inc === '' || !inc || parseFloat(inc) <= 0) ? 0 : parseFloat(inc);
                                if (iNum > 0) {
                                  const newDti = Math.max(0, Math.min(parseFloat((dNum / iNum).toFixed(4)), 0.99));
                                  update('dti', newDti);
                                } else {
                                  update('dti', 0);
                                }
                              }} 
                              disabled={isReadOnly} 
                            />
                          </div>
                          <div>
                            <div className="flab">Pre-calculated Income (₹)</div>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className="finput" 
                              value={curData.dtiIncome} 
                              placeholder={curData.income || "0"} 
                              onChange={e => {
                                const inc = e.target.value.replace(/\D/g, '');
                                const debt = curData.dtiDebt;
                                update('dtiIncome', inc);
                                const dNum = (debt === '' || !debt) ? 0 : parseFloat(debt);
                                const iNum = (inc === '' || parseFloat(inc) <= 0) ? 0 : parseFloat(inc);
                                if (iNum > 0) {
                                  const newDti = Math.max(0, Math.min(parseFloat((dNum / iNum).toFixed(4)), 0.99));
                                  update('dti', newDti);
                                } else {
                                  update('dti', 0);
                                }
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
                        <div className="flab">Active Credit Lines <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '11px', marginLeft: '4px' }}>(Optional)</span></div>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="finput" 
                          value={curData.lines} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            update('lines', val);
                          }} 
                          disabled={isReadOnly} 
                        />
                      </div>

                      <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(75,168,224,0.1)', color: 'var(--sky)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>02</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sky)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Loan Details</div>
                      </div>
                      <div>
                        <div className="flab">Purpose</div>
                        <div className="combo-field">
                          <select className="fselect" value={curData.purpose} onChange={e => update('purpose', e.target.value)} disabled={isReadOnly}>
                            <option value="home">Home</option><option value="auto">Auto</option><option value="education">Education</option><option value="business">Business</option><option value="personal">Personal</option><option value="medical">Medical</option><option value="travel">Travel</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <div className="flab">Term <span className="combo-tag">+ Custom</span></div>
                        <div className="combo-field">
                          <select className={`fselect ${curData.term === 'custom' ? 'has-manual' : ''}`} value={curData.term} onChange={e => update('term', e.target.value)} disabled={isReadOnly}>
                            <option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="custom">Enter months manually…</option>
                          </select>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={`combo-manual ${curData.term === 'custom' ? 'show' : ''}`}
                            placeholder="e.g. 18, 42, 72 months…"
                            value={curData.customTerm}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              update('customTerm', val);
                            }}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                      {page === 'bpg-simulator' && (
                        <div>
                          <div className="flab">Expected Interest Rate (% p.a.)</div>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="finput"
                            placeholder="e.g. 10.5"
                            value={curData.rate}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              const parts = val.split('.');
                              if (parts.length <= 2) update('rate', val);
                            }}
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
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="finput" 
                          value={curData.empl} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            update('empl', val);
                          }} 
                          disabled={isReadOnly} 
                        />
                      </div>
                      <div>
                        <div className="flab">Past 5y Job Changes</div>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="finput" 
                          value={curData.jobChanges} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            update('jobChanges', val);
                          }} 
                          disabled={isReadOnly} 
                        />
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
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className="finput" 
                              value={curData.extLoanAmt} 
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                update('extLoanAmt', val);
                              }} 
                              disabled={isReadOnly} 
                            />
                          </div>
                          <div>
                            <div className="flab">Monthly EMI Being Paid (₹)</div>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className="finput" 
                              value={curData.extEmi} 
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                update('extEmi', val);
                              }} 
                              disabled={isReadOnly} 
                            />
                          </div>
                          <div>
                            <div className="flab">Interest Rate (% p.a.)</div>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              className="finput" 
                              placeholder="e.g. 10.5" 
                              value={curData.extRate || ''} 
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                const parts = val.split('.');
                                if (parts.length <= 2) update('extRate', val);
                              }} 
                              disabled={isReadOnly} 
                            />
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

                      {/* Document Verification Section (Apply Only) */}
                      {page === 'bpg-apply' && !isReadOnly && (
                        <>
                          <div className="fg-sec" style={{ gridColumn: '1 / -1', borderBottom: '2px solid var(--ice)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--navy-glow)', color: 'var(--navy)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>07</div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Document Verification</div>
                              <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '2px', fontWeight: 500 }}>Please upload clear documents to expedite your loan processing. Max 5MB each (JPG, PNG, PDF).</div>
                            </div>
                          </div>

                          {/* 1. Identity Proof */}
                          <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px' }}>1. Identity Proof</div>
                              <select
                                className="fselect"
                                style={{ width: '200px', height: '32px', fontSize: '12px', padding: '0 12px' }}
                                value={selectedIdType}
                                onChange={e => {
                                  setSelectedIdType(e.target.value);
                                  setDocs(p => ({ ...p, idFront: null, idBack: null })); // Reset files on type change
                                }}
                              >
                                <option value="aadhaar">Aadhaar Card</option>
                                <option value="pan">PAN Card</option>
                                <option value="passport">Passport</option>
                                <option value="voterid">Voter ID</option>
                                <option value="dl">Driving License</option>
                              </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                              <DocCard
                                label={`${selectedIdType.toUpperCase()} (Front)`}
                                id="idFront"
                                file={docs.idFront}
                                onUpload={f => setDocs(p => ({ ...p, idFront: f }))}
                              />
                              {selectedIdType !== 'pan' && (
                                <DocCard
                                  label={`${selectedIdType.toUpperCase()} (Back)`}
                                  id="idBack"
                                  file={docs.idBack}
                                  onUpload={f => setDocs(p => ({ ...p, idBack: f }))}
                                />
                              )}
                            </div>
                          </div>

                          {/* 2. Address Proof */}
                          <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>2. Address Proof</div>
                            <div style={{ fontSize: '11px', color: 'var(--slate)', opacity: 0.7, marginBottom: '16px' }}>Upload any valid utility bill, rental agreement, or government ID.</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                              <DocCard label="Address Proof Doc" id="addressProof" file={docs.addressProof} onUpload={f => setDocs(p => ({ ...p, addressProof: f }))} />
                            </div>
                          </div>

                          {/* 3. Income Proof */}
                          <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>3. Income Proof</div>
                            <div style={{ fontSize: '11px', color: 'var(--slate)', opacity: 0.7, marginBottom: '16px' }}>Last 3 months preferred. Salary slips or bank statements.</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                              <DocCard label="Salary Slip (PDF)" id="salarySlip" file={docs.salarySlip} onUpload={f => setDocs(p => ({ ...p, salarySlip: f }))} accept=".pdf" />
                              <DocCard label="Bank Statement (PDF)" id="bankStatement" file={docs.bankStatement} onUpload={f => setDocs(p => ({ ...p, bankStatement: f }))} accept=".pdf" />
                            </div>
                          </div>

                          {/* 4. Optional Verification */}
                          <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>4. Additional Verification <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                              <DocCard label="Selfie Verification" id="selfie" file={docs.selfie} onUpload={f => setDocs(p => ({ ...p, selfie: f }))} />
                              <DocCard label="Employment ID" id="empId" file={docs.empId} onUpload={f => setDocs(p => ({ ...p, empId: f }))} />
                              <DocCard label="Co-applicant Doc" id="coApplicant" file={docs.coApplicant} onUpload={f => setDocs(p => ({ ...p, coApplicant: f }))} />
                            </div>
                          </div>
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
                            <button
                              className="btn-assess"
                              onClick={handleSimulate}
                              disabled={!!ageError || curData.age === ''}
                              style={{ opacity: (!!ageError || curData.age === '') ? 0.6 : 1, cursor: (!!ageError || curData.age === '') ? 'not-allowed' : 'pointer' }}
                            >
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
                              <button
                                className="btn-assess"
                                onClick={handleOfficialApply}
                                disabled={applySubmitting || !!ageError || curData.age === ''}
                                style={{ opacity: (applySubmitting || !!ageError || curData.age === '') ? 0.6 : 1, cursor: (applySubmitting || !!ageError || curData.age === '') ? 'not-allowed' : 'pointer' }}
                              >
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
            <div ref={resultRef} className="fade-in" style={{ marginTop: '24px', color: 'var(--navy)' }}>
              {/* HERO SECTION */}
              <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600, fontFamily: "'Georgia', serif", color: 'var(--navy)' }}>Eligibility Report</h2>
                <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '6px', letterSpacing: '0.5px', fontWeight: 500 }}>
                  Assessed by GroundZero ML Intelligence · {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <span style={{
                    padding: '6px 12px',
                    background: result.level === 'low' ? 'rgba(13, 148, 136, 0.1)' : result.level === 'med' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: result.level === 'low' ? '#0d9488' : result.level === 'med' ? '#f59e0b' : '#ef4444',
                    borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                    border: `1px solid ${result.level === 'low' ? 'rgba(13, 148, 136, 0.2)' : result.level === 'med' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <span style={{ width: '8px', height: '8px', background: result.level === 'low' ? '#0d9488' : result.level === 'med' ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
                    {result.level === 'low' ? 'Likely Approved' : result.level === 'med' ? 'Review Required' : 'High Risk Profile'}
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
                    <div style={{ fontSize: '80px', fontWeight: 800, color: result.level === 'low' ? '#0d9488' : result.level === 'med' ? '#f59e0b' : '#ef4444', lineHeight: 1, fontFamily: "'Georgia', serif" }}>{result.pct}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '12px', fontWeight: 700 }}>Default Probability</div>
                    <div style={{ height: '6px', background: 'var(--bg)', borderRadius: '3px', marginTop: '40px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${result.pct}%`, background: result.level === 'low' ? '#0d9488' : result.level === 'med' ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--slate)', marginTop: '20px', fontWeight: 600 }}>Category: {result.level === 'low' ? 'Low (<30%)' : result.level === 'med' ? 'Medium (30-60%)' : 'High (>60%)'}</div>
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
                      <th>Loan ID</th>
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
                        <td style={{ fontWeight: 800, color: 'var(--sky)' }}>{app.loan_id || `--`}</td>
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
              <div style={{ marginBottom: '40px' }}>
                <h1 className="h-serif" style={{ fontSize: '32px' }}>Investment <span style={{ color: 'var(--gold)' }}>Roadmap</span></h1>
                <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>
                  A simplified strategy to grow your wealth based on your <strong>{activeProfile.source.replace('bank_', '').toUpperCase()}</strong> profile.
                </p>
              </div>

              {!activeProfile ? (
                <div className="card" style={{ textAlign: 'center', padding: '100px 40px', color: 'var(--slate)' }}>
                  <div style={{ fontSize: '56px', marginBottom: '24px' }}>🔒</div>
                  <h3 className="h-serif" style={{ color: 'var(--navy-deep)', marginBottom: '12px' }}>Roadmap Locked</h3>
                  <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '15px', lineHeight: 1.6 }}>Submit an application or check eligibility to unlock your personalized investment plan.</p>
                  <button className="lp-btn-solid" style={{ marginTop: '32px', padding: '14px 32px' }} onClick={() => setPage('bpg-simulator')}>Get Started</button>
                </div>
              ) : (
                <>
                  {/* Primary Recommendation Banner */}
                  <div style={{ 
                    background: 'var(--navy-deep)', 
                    color: '#fff', 
                    borderRadius: '24px', 
                    padding: '40px', 
                    marginBottom: '40px', 
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '120px', opacity: 0.05 }}>📈</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Master Strategy</div>
                      <h2 className="h-serif" style={{ fontSize: '28px', color: '#fff', marginBottom: '16px' }}>
                        {activeProfile.level === 'low' ? 'Aggressive Growth Plan' : 'Capital Protection Plan'}
                      </h2>
                      <p style={{ fontSize: '16px', opacity: 0.8, lineHeight: 1.8, maxWidth: '700px' }}>
                        {activeProfile.source.includes('approved') 
                          ? `With your recent loan Approval, you have demonstrated high financial discipline. We recommend allocating surplus funds into equity-linked assets to outpace your interest rate.`
                          : activeProfile.source.includes('rejected')
                          ? "Based on your bank review, your priority is stability. We suggest 100% allocation in guaranteed-return assets to rebuild your credit buffer without market risk."
                          : "Your profile suggests a balanced approach. Focus on liquid assets that keep you ready for your upcoming loan obligations while earning a steady 7-8% return."
                        }
                      </p>
                    </div>
                  </div>

                  {/* Recommendation Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                    {[
                      { 
                        id: 'SGB', 
                        name: 'Gold Bonds (SGB)', 
                        profit: '12.5%', 
                        risk: 'Safe', 
                        desc: 'Sovereign guarantee with 2.5% extra interest.',
                        why: 'Perfect hedge against loan liabilities.',
                        color: 'var(--gold)',
                        icon: '🌕'
                      },
                      { 
                        id: 'NIFTY', 
                        name: 'Nifty 50 Index', 
                        profit: '14.2%', 
                        risk: 'Moderate', 
                        desc: 'India\'s top 50 companies for long-term growth.',
                        why: 'Best for Approved profiles with low DTI.',
                        color: 'var(--teal)',
                        icon: '📊'
                      },
                      { 
                        id: 'FD', 
                        name: 'Fixed Deposits', 
                        profit: '7.1%', 
                        risk: 'Secure', 
                        desc: 'Guaranteed returns with instant liquidity.',
                        why: 'Recommended for building emergency buffers.',
                        color: 'var(--sky)',
                        icon: '🛡️'
                      }
                    ].filter(a => {
                      if (activeProfile.level === 'high') return a.risk === 'Secure' || a.risk === 'Safe';
                      return true;
                    }).map(asset => (
                      <div key={asset.id} 
                        className={`card ${selectedAsset === asset.id ? 'active-investment' : ''}`} 
                        onClick={() => setSelectedAsset(selectedAsset === asset.id ? null : asset.id)}
                        style={{ 
                          padding: '32px', 
                          border: selectedAsset === asset.id ? `2px solid ${asset.color}` : '1px solid var(--border)', 
                          background: selectedAsset === asset.id ? `${asset.color}05` : '#fff',
                          transition: 'all 0.3s ease', 
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        {selectedAsset === asset.id && (
                          <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', color: asset.color, fontWeight: 900 }}>VIEWING TREND</div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                          <div style={{ width: '48px', height: '48px', background: `${asset.color}15`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: asset.color }}>
                            {asset.icon}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Est. Annual Profit</div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--navy-deep)' }}>{asset.profit}</div>
                          </div>
                        </div>
                        <h3 style={{ fontSize: '18px', color: 'var(--navy-deep)', marginBottom: '8px' }}>{asset.name}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--slate)', lineHeight: 1.6, marginBottom: '20px' }}>{asset.desc}</p>
                        <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--navy)', fontWeight: 600 }}>
                          💡 {asset.why}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Trend Analysis Section (Appears on Click) */}
                  {selectedAsset && (
                    <div className="card fade-in" style={{ padding: '40px', marginBottom: '40px', background: '#fff', border: '1.5px solid var(--ice)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--sky)', textTransform: 'uppercase', letterSpacing: '1px' }}>Performance History</div>
                          <h3 className="h-serif" style={{ fontSize: '24px', color: 'var(--navy-deep)', margin: '4px 0' }}>{selectedAsset} Trend Analysis</h3>
                        </div>
                        <button onClick={() => setSelectedAsset(null)} style={{ background: 'var(--ice)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', color: 'var(--slate)' }}>CLOSE CHART ×</button>
                      </div>
                      
                      <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
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
                                <path d={areaStr} fill="url(#chartGrad)" style={{ transition: 'all 0.6s ease' }} />
                                <path d={pathStr} fill="none" stroke="var(--sky)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.6s ease' }} />
                                {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="6,6" />)}
                                <circle cx="100" cy={pts[pts.length - 1].split(',')[1]} r="5" fill="var(--sky)" stroke="#fff" strokeWidth="2.5" />
                              </>
                            );
                          })()}
                        </svg>
                        <div style={{ position: 'absolute', bottom: '-24px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--slate)', fontWeight: 600 }}>
                          <span>Past 12 Months</span>
                          <span>Today</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '50px', background: 'var(--bg)', padding: '20px', borderRadius: '12px', fontSize: '13px', color: 'var(--slate)', lineHeight: 1.6 }}>
                        <strong>Analyst Note:</strong> The trend for {selectedAsset} shows strong resilience over the last fiscal cycle. Clicking other cards will update this view to compare relative performance.
                      </div>
                    </div>
                  )}

                  {/* Why Invest Section */}
                  <div className="card" style={{ padding: '40px', background: '#fff', border: '1.5px solid var(--ice)' }}>
                    <h3 className="h-serif" style={{ fontSize: '22px', marginBottom: '24px' }}>Why these suggestions for you?</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ fontSize: '24px' }}>📉</div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>Loan Surplus Utilization</div>
                          <p style={{ fontSize: '13px', color: 'var(--slate)', lineHeight: 1.6 }}>Investing your loan surplus in assets with {activeProfile.level === 'low' ? '12%+' : '7%+'} returns effectively reduces your net interest burden.</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ fontSize: '24px' }}>🛡️</div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>Risk Matching</div>
                          <p style={{ fontSize: '13px', color: 'var(--slate)', lineHeight: 1.6 }}>We\'ve matched these assets to your <strong>{activeProfile.level.toUpperCase()}</strong> risk profile to ensure your loan repayment capacity is never compromised.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
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
  const purposeMap = { home: "Home", auto: "Auto", education: "Education", business: "Business", medical: "Medical", personal: "Personal Loan", other: "Other", custom: "Other" };

  const displayPurpose = data.purpose === 'custom' ? data.customPurpose : (purposeMap[data.purpose] || data.purpose);
  const effectiveTerm = data.term === 'custom' ? data.customTerm : data.term;

  const status = result.adjustedD?.status || 'Under Review';
  const isRejected = status === 'Rejected';
  const isApproved = status === 'Approved';

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="h-serif" style={{ fontSize: '32px', margin: 0 }}>Application <span style={{ color: 'var(--gold)' }}>Summary</span></h1>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sky)', marginTop: '4px' }}>Loan ID: {data.loan_id || 'N/A'}</div>
          <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>Review your loan application status and risk assessment details.</p>
        </div>
        <button onClick={onBack} className="lp-btn-secondary" style={{ padding: '10px 24px', width: 'auto' }}>
          ← BACK TO MY APPLICATIONS
        </button>
      </div>

      {/* NEW: Application Review Summary Section */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', marginBottom: '32px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Application Review Summary</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 800,
                background: isApproved ? 'rgba(56,201,176,0.1)' : isRejected ? 'rgba(232,84,117,0.1)' : 'rgba(201,151,60,0.1)',
                color: isApproved ? 'var(--teal)' : isRejected ? 'var(--rose)' : 'var(--gold)',
                border: `1px solid ${isApproved ? 'var(--teal)' : isRejected ? 'var(--rose)' : 'var(--gold)'}22`
              }}>
                {status.toUpperCase()}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--slate)', fontWeight: 500 }}>
                {isApproved ? 'Congratulations! Your loan has been approved.' : isRejected ? 'Your application requires adjustments for approval.' : 'Your application is currently being evaluated by our underwriters.'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 600 }}>Review Date</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>{new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
          {/* Risk Indicator Card */}
          <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '16px' }}>Risk Assessment</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: result.level === 'low' ? 'var(--teal)' : result.level === 'med' ? 'var(--gold)' : 'var(--rose)' }}>{result.pct}%</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', paddingBottom: '4px' }}>Default Prob.</div>
            </div>
            <div style={{ height: '6px', background: 'var(--ice)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${result.pct}%`, background: result.level === 'low' ? 'var(--teal)' : result.level === 'med' ? 'var(--gold)' : 'var(--rose)' }} />
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px', fontWeight: 600, color: 'var(--slate)' }}>
              Risk Level: <span style={{ color: result.level === 'low' ? 'var(--teal)' : result.level === 'med' ? 'var(--gold)' : 'var(--rose)', fontWeight: 800 }}>{result.level.toUpperCase()}</span>
            </div>
          </div>

          {/* Decision Details Card */}
          <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isApproved ? (
              <>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '8px' }}>Approved Interest Rate</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sky)' }}>{result.adjustedD?.assigned_rate || result.adjustedD?.interest_rate}% <span style={{ fontSize: '12px', fontWeight: 600 }}>Fixed</span></div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--slate)' }}>Monthly EMI: <strong>₹{fmt(result.sched.emi)}</strong></div>
              </>
            ) : isRejected ? (
              <>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '8px' }}>Rejection Reason</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rose)', lineHeight: 1.4 }}>
                  {result.pct > 60 ? 'High repayment risk detected' : data.dti > 0.4 ? 'Existing debt burden too high' : 'Credit profile needs improvement'}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--slate)', opacity: 0.8 }}>Based on current financial data</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '8px' }}>Underwriting Queue</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>Awaiting manual review</div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--slate)' }}>Avg. processing time: 24-48 hours</div>
              </>
            )}
          </div>

          {/* Improvement Tips Card */}
          <div style={{ background: isRejected ? 'rgba(232,84,117,0.03)' : 'var(--bg)', borderRadius: '12px', padding: '20px', border: `1px solid ${isRejected ? 'rgba(232,84,117,0.1)' : 'var(--border)'}` }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '10px' }}>
              {isApproved ? 'Next Steps' : 'Improvement Tips'}
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: '11px', color: 'var(--navy)', fontWeight: 600, lineHeight: 1.6 }}>
              {isApproved ? (
                <>
                  <li>Check your registered email</li>
                  <li>Complete e-Sign verification</li>
                  <li>Funds disbursed in 3-5 days</li>
                </>
              ) : isRejected ? (
                <>
                  <li>Reduce active credit card balances</li>
                  <li>Improve debt-to-income (DTI) ratio</li>
                  <li>Apply for a lower loan amount</li>
                </>
              ) : (
                <>
                  <li>Keep KYC documents ready</li>
                  <li>Verify income sources</li>
                  <li>Monitor application status</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isRejected ? '1fr' : '1fr 2fr', gap: '32px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--navy-deep)', marginBottom: '24px' }}>Detailed Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { l: 'Loan Amount', v: `₹${fmt(data.loanAmt)}` },
              { l: 'Purpose', v: displayPurpose },
              { l: 'Term', v: `${effectiveTerm} Months` },
              { l: 'Education', v: eduMap[data.edu] || data.edu },
              { l: 'Employment', v: empMap[data.empType] || data.empType },
              { l: 'Credit Score', v: data.credit },
              { l: 'Status', v: status }
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
              {isApproved ? 'Your profile demonstrated exceptional stability. We have processed your application with a competitive interest rate.' : isRejected ? 'Our automated risk engine identified potential repayment challenges. Please review the improvement tips to increase your eligibility for future requests.' : 'We are currently validating your income stability. Please ensure all uploaded documents are legible.'}
            </p>
          </div>
        </div>

        {!isRejected && (
          <div className="analyst-table-container">
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--navy-deep)', margin: 0 }}>Amortization lifecycle</h3>
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
        )}
      </div>
    </div>
  );
};
