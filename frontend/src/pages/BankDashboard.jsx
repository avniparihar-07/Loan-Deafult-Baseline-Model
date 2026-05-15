import React, { useState, useEffect, useRef } from 'react';

import Sidebar from '../components/Sidebar';

import ArthaAI from '../components/ArthaAI';

import { calcRisk, buildSched, fmt, fmtK } from '../utils/model';

import { apiUrl } from '../services/api';

import Chart from 'chart.js/auto';

// --- Behavioral Data Simulation (DEMO MODE: STATIC HARDCODED) ---
const getBehavioralData = (app) => {
  // Static high-quality data for demo
  const allocation = [35, 0, 15, 30, 12, 8]; // Fixed Income, Equity MF, Gold, MF, Savings, FD
  const incomeTrend = [85000, 84200, 86000, 85500, 87000, 86500, 88000, 87500, 89000, 88500, 90000, 89500];
  const spendTrend = [52000, 51000, 53000, 52500, 54000, 53500, 55000, 54500, 56000, 55500, 57000, 56500];
  const categories = [25000, 8500, 4200, 7500, 12000, 5000, 26000]; // Rent, Food, Travel, Shop, EMI, Leisure, Savings

  const txs = [
    { date: '04 May', category: 'Grocery Supermarket', amount: 3240, type: 'Debit' },
    { date: '02 May', category: 'Institutional Payroll Ltd', amount: 85000, type: 'Credit' },
    { date: '28 Apr', category: 'HDFC Mutual Fund SIP', amount: 15000, type: 'Debit' },
    { date: '25 Apr', category: 'Amazon Retail India', amount: 4200, type: 'Debit' },
    { date: '20 Apr', category: 'Existing Home Loan EMI', amount: 12500, type: 'Debit' },
    { date: '15 Apr', category: 'Tata Power Utility', amount: 3100, type: 'Debit' },
  ];

  const insights = [
    { type: 'pos', text: "Consistent monthly savings rate >30% observed in historical data." },
    { type: 'pos', text: "Stable employment-to-income ratio maintained for 24 months." },
    { type: 'pos', text: "No exposure to high-risk speculative trading accounts detected." }
  ];

  return { allocation, incomeTrend, spendTrend, categories, txs, insights };
};

export default function BankDashboard({ user, onLogout, theme, toggleTheme }) {

  const [page, setPage] = useState('bd-overview');

  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const [apps, setApps] = useState([]);

  const [selectedApp, setSelectedApp] = useState(null);

  const [assignedRate, setAssignedRate] = useState('');
  const [assignedTerm, setAssignedTerm] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [industry, setIndustry] = useState('IT & Software');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [decisionMode, setDecisionMode] = useState(null); // 'approve' | 'reject' | 'verify' | null
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [toast, setToast] = useState(null); //{ message, type}

  const [behData, setBehData] = useState(null);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, high_risk: 0 });
  const [analytics, setAnalytics] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [emailType, setEmailType] = useState('General Update');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // 'success' | 'error'

  const handleEmailTypeChange = (type, currentApp) => {
    const app = currentApp || selectedApp;
    setEmailType(type);
    let subject = '';
    let body = '';
    const name = app ? (app.full_name || 'Applicant') : 'Applicant';

    switch (type) {
      case 'Loan Approved':
        subject = 'Your Loan Application Has Been Approved';
        body = `Dear ${name},\n\nWe are pleased to inform you that your loan application has been approved.\n\nOur team will be in touch shortly with the next steps for disbursement.\n\nBest regards,\nGroundZero Underwriting Team`;
        break;
      case 'Loan Rejected':
        subject = 'Update Regarding Your Loan Request';
        body = `Dear ${name},\n\nThank you for applying with GroundZero. After careful review, we are unable to approve your loan application at this time.\n\nReason: [Specify reason here]\n\nBest regards,\nGroundZero Underwriting Team`;
        break;
      case 'Additional Documents Required':
        subject = 'Action Required: Additional Verification Documents';
        body = `Dear ${name},\n\nTo proceed with your application, we require the following documents:\n\n1. [Document Name 1]\n2. [Document Name 2]\n\nPlease upload these through your portal at your earliest convenience.\n\nBest regards,\nGroundZero Underwriting Team`;
        break;
      case 'Under Review':
        subject = 'Your Application is Under Review';
        body = `Dear ${name},\n\nWe are currently reviewing your loan application. We will notify you as soon as a final decision is made.\n\nBest regards,\nGroundZero Underwriting Team`;
        break;
      case 'General Update':
        subject = 'Update on Your Loan Application';
        body = `Dear ${name},\n\n[Write your custom update here]\n\nBest regards,\nGroundZero Underwriting Team`;
        break;
    }
    setEmailSubject(subject);
    setEmailBody(body);
  };

  const sendActualEmail = async () => {
    if (!selectedApp) return;
    setEmailSending(true);
    try {
      const resp = await fetch(apiUrl('/api/send-communication'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: selectedApp.id,
          subject: emailSubject,
          body: emailBody,
          borrower_name: selectedApp.full_name || 'Applicant'
        })
      });
      const data = await resp.json();
      if (data.success) {
        setEmailStatus('success');
        setTimeout(() => setEmailStatus(null), 4000);
      } else {
        alert(data.error || 'Failed to send email. Verify RESEND_API_KEY in backend.');
        setEmailStatus('error');
      }
    } catch (err) {
      console.error(err);
      setEmailStatus('error');
    } finally {
      setEmailSending(false);
    }
  };

  useEffect(() => {
    if (selectedApp) {
      handleEmailTypeChange('General Update', selectedApp);
      setEmailStatus(null);
      setAnalysisResult(null);
      setDecisionMode(null);
    }
  }, [selectedApp]);

  const [formData, setFormData] = useState({

    fullName: '', age: '', credit: '', income: '', loanAmt: '', dti: '', lines: '',

    purpose: 'home', term: '24', rate: '', empType: 'full', empl: '', jobChanges: '',

    edu: 'bach', marital: 'single', state: 'MH', customPurpose: '', customTerm: '',

    bank: 'SBI', customBank: '', extRate: '', extPurpose: 'home', customExtPurpose: ''

  });

  const [flags, setFlags] = useState({ mort: 'N', dep: 'N', co: 'N', extloan: 'N' });

  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && page === 'bd-assess' && resultRef.current) {
      setTimeout(() => {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [result, page]);

  const [opt, setOpt] = useState({ loanAmt: 130000, credit: 575, dti: 0.35, empType: 'full' });

  const optProb = calcRisk({ ...formData, loanAmt: opt.loanAmt, credit: opt.credit, dti: opt.dti, empType: opt.empType }, flags);

  const update = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  const tog = (k, v) => setFlags(prev => ({ ...prev, [k]: v }));

  const fetchApps = () => {
    const bankParam = user?.bank_name ? `?bank_name=${encodeURIComponent(user.bank_name)}` : '';
    const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    
    // Fetch Applications
    fetch(apiUrl(`/api/applications${bankParam}${searchParam}`))
      .then(r => r.json())
      .then(data => setApps(Array.isArray(data) ? data : []))
      .catch(e => console.error("Error fetching apps:", e));

    // Fetch Stats
    fetch(apiUrl(`/api/bank-dashboard/stats${bankParam}`))
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
          console.log('[BankDashboard] Raw DB Stats:', data);
        }
      })
      .catch(e => console.error("Error fetching stats:", e));

    // Fetch Analytics
    fetch(apiUrl(`/api/bank-dashboard/analytics${bankParam}`))
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setAnalytics(data);
          console.log('[BankDashboard] Grouped Analytics API Payload:', data);
        }
      })
      .catch(e => console.error("Error fetching analytics:", e));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApps();
    }, 500); 
    
    const interval = setInterval(fetchApps, 30000); // Poll less frequently when searching
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [searchQuery, user?.bank_name]);

  useEffect(() => {

    let mAssetC = null, mTrendC = null, mSpendC = null;

    if (selectedApp && behData) {

      // Need a small timeout to ensure modal DOM is ready

      const timer = setTimeout(() => {

        const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

        const lineC = theme === 'dark' ? '#ECF0F8' : '#0C1428';

        const ctxAsset = document.getElementById('modal-cht-asset');

        if (ctxAsset) {

          mAssetC = new Chart(ctxAsset, {

            type: 'doughnut',

            data: {

              labels: ['Stocks', 'Crypto', 'Gold', 'MF', 'Savings', 'FD'],

              datasets: [{ data: behData.allocation, backgroundColor: ['#38C9B0', '#E85475', '#C9973C', '#4BA8E0', '#0C1428', '#A4B0C8'], borderWidth: 0 }]

            },

            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }

          });

        }

        const ctxTrend = document.getElementById('modal-cht-trend');

        if (ctxTrend) {

          mTrendC = new Chart(ctxTrend, {

            type: 'line',

            data: {

              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

              datasets: [

                { label: 'Income', data: behData.incomeTrend, borderColor: '#38C9B0', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true, backgroundColor: 'rgba(56,201,176,0.05)' },

                { label: 'Spending', data: behData.spendTrend, borderColor: '#E85475', borderWidth: 2, pointRadius: 0, tension: 0.4 },

                { label: 'Savings', data: behData.incomeTrend.map((v, i) => v - behData.spendTrend[i]), borderColor: 'var(--gold)', borderWidth: 1, borderDash: [4, 4], pointRadius: 0, tension: 0.4 }

              ]

            },

            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g }, ticks: { callback: v => '₹' + v / 1000 + 'K' } } } }

          });

        }

        const ctxSpend = document.getElementById('modal-cht-spend');

        if (ctxSpend) {

          mSpendC = new Chart(ctxSpend, {

            type: 'bar',

            data: {

              labels: ['Rent', 'Food', 'Travel', 'Shop', 'EMI', 'Leisure', 'Savings'],

              datasets: [{ data: behData.categories, backgroundColor: '#4BA8E0', borderRadius: 4 }]

            },

            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: g } }, y: { grid: { display: false } } } }

          });

        }

      }, 100);

      return () => {

        clearTimeout(timer);

        [mAssetC, mTrendC, mSpendC].forEach(c => c && c.destroy());

      };

    }

  }, [selectedApp, behData, theme]);

  useEffect(() => {

    if (selectedApp) {

      setBehData(getBehavioralData(selectedApp));

    } else {

      setBehData(null);

    }

  }, [selectedApp]);

  const showToast = (message, type = 'success') => {

    setToast({ message, type });

    setTimeout(() => setToast(null), 3000);

  };

  // Also fetch when page changes to ensure fresh data

  useEffect(() => {

    if (page === 'bd-underwriting' || page === 'bd-overview' || page === 'bd-insights') {

      fetchApps();

    }

    if (page === 'bd-assess') {

      setResult(null);

    }

  }, [page]);

  const handleReviewSubmit = async (decision) => {
    if (decision === 'Approved' && !assignedRate) {
      showToast("Please assign an interest rate.", "error");
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/applications/${selectedApp.id}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_rate: parseFloat(assignedRate) || null,
          decision: decision,
          note: reviewNote,
          industry: industry,
          bank_name: user?.bank_name,
          default_probability: analysisResult?.default_probability,
          risk_score: analysisResult?.risk_score,
          risk_category: analysisResult?.risk_category,
          emi: analysisResult?.emi,
          tenure: selectedApp?.term
        })
      });

      if (res.ok) {
        let msg = "Decision recorded successfully";
        if (decision === 'Approved') msg = "Loan Approved & Sanction Letter Dispatched!";
        if (decision === 'Rejected') msg = "Loan Application Declined.";
        if (decision === 'Additional Verification Required') msg = "Verification Request Sent to Borrower.";

        showToast(msg, decision === 'Approved' ? 'success' : 'error');
        fetchApps();
        
        // Auto close modal
        setTimeout(() => {
          setSelectedApp(null);
          setDecisionMode(null);
        }, 500);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to submit review", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to submit review", "error");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!assignedRate) {
      showToast("Enter interest rate for analysis", "error");
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch(apiUrl(`/api/applications/${selectedApp.id}/analyze`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_rate: assignedRate })
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
        showToast("Dynamic analysis complete", "success");
      } else {
        showToast(data.error || "Analysis failed", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };


  const handleSubmit = async () => {

    const required = ['age', 'income', 'loanAmt', 'empl', 'credit', 'rate', 'term'];

    for (let f of required) {

      if (formData[f] === '' || formData[f] === null || formData[f] === undefined) {

        alert(`Please enter a value for ${f.replace(/([A-Z])/g, ' $1').toLowerCase()}`);

        return;

      }

    }

    if (formData.term === 'custom' && !formData.customTerm) {

      alert('Please enter a custom loan term');

      return;

    }

    const purposeMap = { home: "Home", auto: "Auto", education: "Education", business: "Business", personal: "Personal", medical: "Medical", travel: "Travel" };

    const effectivePurpose = formData.purpose;

    const payload = {

      Age: formData.age,

      Income: formData.income,

      LoanAmount: formData.loanAmt,

      CreditScore: formData.credit,

      MonthsEmployed: formData.empl,

      NumCreditLines: formData.lines,

      InterestRate: formData.rate,

      LoanTerm: effectiveTerm,

      DTIRatio: formData.dti,

      Education: formData.edu === 'hs' ? 'High School' : formData.edu === 'bach' ? "Bachelor's" : formData.edu === 'mast' ? "Master's" : "PhD",

      EmploymentType: formData.empType === 'full' ? 'Full-time' : formData.empType === 'part' ? 'Part-time' : formData.empType === 'self' ? 'Self-employed' : 'Unemployed',

      MaritalStatus: formData.marital === 'married' ? 'Married' : formData.marital === 'single' ? 'Single' : 'Divorced',

      HasMortgage: flags.mort === 'Y' ? 'Yes' : 'No',

      HasDependents: flags.dep === 'Y' ? 'Yes' : 'No',

      LoanPurpose: purposeMap[effectivePurpose] || "Personal",

      HasCoSigner: flags.co === 'Y' ? 'Yes' : 'No',

      FullName: formData.fullName || "Bank Manual Entry",

      Email: formData.fullName ? `${formData.fullName.replace(/\s/g, '').toLowerCase()}@manual.bank` : "manual@bank.com",

      State: formData.state || 'MH',

      JobChanges: formData.jobChanges || 0

    };

    try {

      const res = await fetch(apiUrl('/api/predict'), {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(payload)

      });

      if (res.ok) {

        const apiData = await res.json();

        // Refresh apps list after saving

        fetchApps();

        // Update local result with real API data

        const apiFeatures = (apiData.top_risk_factors || []).map(f => ({

          name: f.feature,

          val: parseFloat(f.impact.toFixed(3)),

          type: f.impact > 0 ? 'pos' : 'neg'

        }));

        const sched = buildSched(formData.loanAmt, formData.rate, effectiveTerm);

        const emi = sched.emi;

        const totalRepay = sched.tPay;

        const totalInt = sched.tI;

        setResult({

          pct: Math.round(apiData.default_probability * 100),

          level: apiData.risk_category.toLowerCase(),

          emi: emi,

          totalInt: totalInt,

          totalRepay: totalRepay,

          pPct: totalRepay > 0 ? (formData.loanAmt / totalRepay) * 100 : 0,

          iPct: totalRepay > 0 ? (totalInt / totalRepay) * 100 : 0,

          features: apiFeatures,

          sched: sched

        });

        return; // Exit here as we've handled everything with real API data

      }

    } catch (e) {

      console.error("Failed to save assessment to DB:", e);

    }

    const prob = calcRisk({ ...formData, term: effectiveTerm, purpose: effectivePurpose }, flags);

    const pct = Math.round(prob * 100);

    const level = prob < 0.3 ? 'low' : prob < 0.6 ? 'med' : 'high';

    const sched = buildSched(formData.loanAmt, formData.rate, effectiveTerm);

    const emi = sched.emi;

    const totalInt = sched.tI;

    const totalRepay = sched.tPay;

    const pPct = (formData.loanAmt / totalRepay) * 100;

    const iPct = (totalInt / totalRepay) * 100;

    const features = [

      { name: 'Married', val: -0.188, type: 'neg' },

      { name: 'Has CoSigner_Yes', val: -0.142, type: 'neg' },

      { name: 'Loan_Income_Ratio', val: +0.470, type: 'pos' },

      { name: 'Has Dependents_Yes', val: -0.123, type: 'neg' },

      { name: 'Unemployed', val: +0.201, type: 'pos' },

      { name: 'Has Mortgage_Yes', val: -0.074, type: 'neg' },

      { name: 'Part-time', val: +0.125, type: 'pos' },

      { name: 'Self-employed', val: -0.091, type: 'neg' },

      { name: 'NumCreditLines', val: +0.165, type: 'pos' },

      { name: 'PhD', val: -0.075, type: 'neg' }

    ];

    setResult({ pct, level, prob, sched, emi, totalInt, totalRepay, pPct, iPct, features });

  };

  useEffect(() => {

    let trendChart = null, distChart = null, purposeChart = null, creditChart = null, empChart = null, dtiChart = null, coefChart = null;

    let emiChart = null, stackedChart = null, trend18Chart = null, sectorChart = null, geoChart = null, stressChart = null, rocChart = null;

    let portPurposeChart = null, portRiskChart = null;

    const getDist = (arr, key) => {

      const counts = {};

      arr.forEach(a => { counts[a[key]] = (counts[a[key]] || 0) + 1; });

      return counts;

    };

    if (page === 'bd-overview') {

      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

      const lineC = theme === 'dark' ? '#ECF0F8' : '#0C1428';

      const bgC = theme === 'dark' ? '#0C1428' : '#fff';

      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';

      Chart.defaults.font.family = "'Inter',sans-serif";

      const ctxTrend = document.getElementById('cht-trend');

      if (ctxTrend) {

        trendChart = new Chart(ctxTrend, {

          type: 'line',

          data: {

            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
              { 
                label: 'Assessments', 
                data: analytics?.volume_trend || Array(12).fill(0), 
                borderColor: lineC, 
                borderWidth: 2.5, 
                backgroundColor: lineC, 
                pointBackgroundColor: bgC, 
                pointBorderColor: lineC, 
                pointBorderWidth: 2, 
                pointRadius: 4, 
                tension: 0.4, 
                yAxisID: 'y' 
              },

              {
                label: 'Default Rate %', 
                data: analytics?.default_rate_trend || Array(12).fill(0),
                borderColor: '#E85475', 
                borderWidth: 2.5, 
                backgroundColor: '#E85475', 
                pointBackgroundColor: bgC, 
                pointBorderColor: '#E85475', 
                pointBorderWidth: 2, 
                pointRadius: 4, 
                tension: 0.4, 
                yAxisID: 'y1'
              }

            ]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } }, scales: { x: { grid: { color: g } }, y: { grid: { color: g }, title: { display: true, text: 'Assessments' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Default %' }, ticks: { callback: v => v + '%' } } } }

        });

      }

      const ctxDist = document.getElementById('cht-dist');

      if (ctxDist) {

        const d = analytics?.risk_distribution || { Low: 0, Medium: 0, High: 0 };
        distChart = new Chart(ctxDist, {
          type: 'doughnut',
          data: { labels: ['Low Risk (<30%)', 'Medium Risk', 'High Risk (>60%)'], datasets: [{ data: [d.Low || 0, d.Medium || 0, d.High || 0], backgroundColor: ['#38C9B0', '#C9973C', '#E85475'], borderColor: theme === 'dark' ? '#162030' : '#fff', borderWidth: 3, hoverOffset: 8 }] },

          options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } } }

        });

      }

      const ctxPurpose = document.getElementById('cht-purpose');

      if (ctxPurpose) {

        purposeChart = new Chart(ctxPurpose, {

          type: 'bar',

          data: {

            labels: ['Home', 'Auto', 'Education', 'Business', 'Personal', 'Medical', 'Travel'],

            datasets: [{
              data: ['Home', 'Auto', 'Education', 'Business', 'Personal', 'Medical', 'Travel'].map(l => analytics?.purpose_distribution?.[l] || 0),
              backgroundColor: ['#38C9B0', '#C9973C', '#4BA8E0', '#E85475', '#A072F0', '#FF8C42', '#38C9B0'],
              borderRadius: 4
            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g }, ticks: { precision: 0 } } } }

        });

      }

      const ctxCredit = document.getElementById('cht-credit');

      if (ctxCredit) {

        creditChart = new Chart(ctxCredit, {

          type: 'line',

          data: {

            labels: ['300-400', '400-500', '500-600', '600-700', '700-800', '800+'],

            datasets: [{
              label: 'Users',
              data: analytics?.credit_distribution || Array(6).fill(0),
              borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.2
            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g }, ticks: { callback: v => v + '%' } } } }

        });

      }

      const ctxEmp = document.getElementById('cht-emp');

      if (ctxEmp) {

        empChart = new Chart(ctxEmp, {

          type: 'bar',

          data: {

            labels: ['Full-time', 'Self-empl', 'Part-time', 'Unemployed'],

            datasets: [{
              data: ['Full-time', 'Self-employed', 'Part-time', 'Unemployed'].map(l => analytics?.employment_distribution?.[l] || 0),
              backgroundColor: ['#38C9B0', '#4BA8E0', '#C9973C', '#E85475'],
              borderRadius: 4
            }]

          },

          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: g }, ticks: { callback: v => v + '%' } }, y: { grid: { display: false } } } }

        });

      }

      const ctxDti = document.getElementById('cht-dti');

      if (ctxDti) {

        dtiChart = new Chart(ctxDti, {

          type: 'line',

          data: {

            labels: ['0—œ0.2', '0.2—œ0.4', '0.4—œ0.6', '0.6—œ0.8', '0.8—œ1.0'],

            datasets: [{
              label: 'Users',
              data: analytics?.dti_distribution || Array(5).fill(0),
              borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.2
            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g }, ticks: { callback: v => v + '%' } } } }

        });

      }

      const ctxCoef = document.getElementById('cht-coef');

      if (ctxCoef) {

          const coefs = [

            { name: 'Credit Score', val: -0.62 },

            { name: 'Income', val: -0.45 },

            { name: 'Loan Amt', val: 0.38 },

            { name: 'Age', val: -0.22 },

            { name: 'DTI', val: 0.25 }

          ];

        coefChart = new Chart(ctxCoef, {

          type: 'bar',

          data: {

            labels: coefs.map(c => c.name),

            datasets: [{ data: coefs.map(c => c.val), backgroundColor: coefs.map(c => c.val < 0 ? '#38C9B0' : '#E85475'), borderRadius: 4 }]

          },

          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: g } }, y: { grid: { display: false } } } }

        });

      }

    } else if (page === 'bd-underwriting') {

      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';

      Chart.defaults.font.family = "'Inter',sans-serif";

      const ctxEmi = document.getElementById('cht-emi-reg');

      if (ctxEmi) {

        emiChart = new Chart(ctxEmi, {

          type: 'bar',

          data: {

            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

            datasets: [{

              data: analytics?.emi_trend || Array(12).fill(0),

              backgroundColor: ['#38C9B0', '#38C9B0', '#38C9B0', '#38C9B0', '#38C9B0', '#C9973C', '#38C9B0', '#38C9B0', '#38C9B0', '#38C9B0', '#C9973C', '#38C9B0'],

              borderRadius: 4

            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g }, beginAtZero: true, ticks: { callback: v => v.toLocaleString() } } } }

        });

      }

    } else if (page === 'bd-insights' || page === 'bd-reports') {

      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

      const lineC = theme === 'dark' ? '#ECF0F8' : '#0C1428';

      const bgC = theme === 'dark' ? '#0C1428' : '#fff';

      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';

      Chart.defaults.font.family = "'Inter',sans-serif";

      const ctxStacked = document.getElementById('cht-stacked-risk');

      if (ctxStacked) {

        stackedChart = new Chart(ctxStacked, {

          type: 'bar',

          data: {

            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

            datasets: [

              { label: 'Low', data: analytics?.risk_trend?.Low || Array(12).fill(0), backgroundColor: '#38C9B0' },

              { label: 'Medium', data: analytics?.risk_trend?.Medium || Array(12).fill(0), backgroundColor: '#C9973C' },

              { label: 'High', data: analytics?.risk_trend?.High || Array(12).fill(0), backgroundColor: '#E85475' }

            ]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: g }, max: 100, ticks: { callback: v => v + '%' } } } }

        });

      }

      const ctxTrend18 = document.getElementById('cht-trend-18');

      if (ctxTrend18) {

        trend18Chart = new Chart(ctxTrend18, {

          type: 'line',

          data: {

            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

            datasets: [{ data: analytics?.default_rate_trend || Array(12).fill(0), borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.2 }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: g } }, y: { grid: { color: g }, min: 10, ticks: { callback: v => v + '%' } } } }

        });

      }

      const ctxSector = document.getElementById('cht-sector-doughnut');

      if (ctxSector) {

        sectorChart = new Chart(ctxSector, {

          type: 'doughnut',

          data: {

            labels: ['Home', 'Auto', 'Education', 'Business', 'Personal', 'Medical', 'Travel'],

            datasets: [{
              data: ['Home', 'Auto', 'Education', 'Business', 'Personal', 'Medical', 'Travel'].map(l => analytics?.purpose_distribution?.[l] || 0),
              backgroundColor: ['#38C9B0', '#C9973C', '#4BA8E0', '#E85475', '#A072F0', '#FF8C42', '#38C9B0'],
              borderWidth: 0
            }]

          },

          options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: false } } }

        });

      }

      const ctxGeo = document.getElementById('cht-geo-bar');

      if (ctxGeo) {

        geoChart = new Chart(ctxGeo, {

          type: 'bar',

          data: {

            labels: ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Others'],

            datasets: [{

              data: ['MH', 'KA', 'TN', 'DL', 'GJ', 'Other'].map(s => apps.filter(a => (a.state || 'MH') === s).length),

              backgroundColor: '#4BA8E0',

              borderRadius: 4

            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g } } } }

        });

      }

      const ctxStress = document.getElementById('cht-stress-bar');

      if (ctxStress) {

        stressChart = new Chart(ctxStress, {

          type: 'bar',

          data: {

            labels: ['Low Risk', 'Medium Risk', 'High Risk'],

            datasets: [{

              data: ['Low', 'Medium', 'High'].map(r => apps.filter(a => a.risk_category === r).length),

              backgroundColor: ['#38C9B0', '#C9973C', '#E85475'],

              borderRadius: 4

            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g }, ticks: { callback: v => v + '%' } } } }

        });

      }

      const ctxRoc = document.getElementById('cht-roc-curve');

      if (ctxRoc) {

        rocChart = new Chart(ctxRoc, {

          type: 'line',

          data: {

            labels: ['0', '0.2', '0.4', '0.6', '0.8', '1.0'],

            datasets: [

              { label: 'GroundZero LR', data: [0, 0.35, 0.62, 0.81, 0.92, 1.0], borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.4 },

              { label: 'Random', data: [0, 0.2, 0.4, 0.6, 0.8, 1.0], borderColor: '#E85475', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0 }

            ]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: g }, title: { display: true, text: 'False Positive Rate' } }, y: { grid: { color: g }, title: { display: true, text: 'True Positive Rate' } } } }

        });

      }

    } else if (page === 'bd-assess' && result) {

      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

      const lineC = theme === 'dark' ? '#ECF0F8' : '#0C1428';

      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';

      Chart.defaults.font.family = "'Inter',sans-serif";

      const ctxAmort = document.getElementById('cht-amort-assess');

      if (ctxAmort) {

        let labels = [], pData = [], iData = [], bData = [];

        let step = Math.max(1, Math.floor(result.sched.rows.length / 24));

        result.sched.rows.forEach((m, i) => {

          if (i % step === 0 || i === result.sched.rows.length - 1) {

            labels.push(`M${m.m}`);

            pData.push(m.p);

            iData.push(m.i);

            bData.push(m.bal);

          }

        });

        rocChart = new Chart(ctxAmort, {

          type: 'bar',

          data: {

            labels,

            datasets: [

              { type: 'line', label: 'Balance', data: bData, borderColor: lineC, borderWidth: 2, pointRadius: 0, tension: 0, yAxisID: 'y1' },

              { type: 'bar', label: 'Principal', data: pData, backgroundColor: '#4BA8E0', stacked: true, yAxisID: 'y' },

              { type: 'bar', label: 'Interest', data: iData, backgroundColor: '#E85475', stacked: true, yAxisID: 'y' }

            ]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: g }, ticks: { callback: v => v >= 1000 ? fmtK(v) : v } }, y1: { position: 'right', grid: { display: false }, ticks: { callback: v => v >= 1000 ? fmtK(v) : v } } } }

        });

      }

    } else if (page === 'bd-behaviour') {

      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';

      Chart.defaults.font.family = "'Inter',sans-serif";

      const ctxRadar = document.getElementById('cht-radar-behavior');

      if (ctxRadar) {

        trendChart = new Chart(ctxRadar, {

          type: 'radar',

          data: {

            labels: ['Income Health', 'Credit History', 'Employment', 'DTI Health', 'Stability', 'Risk Profile'],

            datasets: [{

              label: 'Applicant Aggregate Profile',

              data: [

                apps.length > 0 ? (apps.reduce((s, a) => s + a.income, 0) / apps.length / 2000) : 70,

                apps.length > 0 ? (apps.reduce((s, a) => s + a.credit_score, 0) / apps.length / 10) : 65,

                apps.length > 0 ? (apps.reduce((s, a) => s + a.months_employed, 0) / apps.length) : 80,

                apps.length > 0 ? (100 - (apps.reduce((s, a) => s + a.dti, 0) / apps.length * 100)) : 75,

                apps.length > 0 ? (apps.filter(a => a.months_employed > 24).length / apps.length * 100) : 85,

                apps.length > 0 ? (100 - (apps.reduce((s, a) => s + a.probability, 0) / apps.length * 100)) : 70

              ],

              backgroundColor: 'rgba(56,201,176,0.15)',

              borderColor: '#38C9B0',

              pointBackgroundColor: theme === 'dark' ? '#0C1428' : '#fff',

              pointBorderColor: '#38C9B0',

            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { angleLines: { color: g }, grid: { color: g }, pointLabels: { color: theme === 'dark' ? '#A4B0C8' : '#5E6E88', font: { family: "'Inter',sans-serif" } }, ticks: { display: false, beginAtZero: true, max: 100 } } } }

        });

      }

      const ctxSpend = document.getElementById('cht-spend-behavior');

      if (ctxSpend) {

        distChart = new Chart(ctxSpend, {

          type: 'line',

          data: {

            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

            datasets: [

              { label: 'Avg User Spending', data: Array(12).fill(0).map(() => (apps.reduce((s, a) => s + a.income, 0) / (apps.length || 1) / 12) * (0.6 + Math.random() * 0.2)), borderColor: theme === 'dark' ? '#ECF0F8' : '#0C1428', borderWidth: 2.5, pointBackgroundColor: '#38C9B0', pointBorderColor: theme === 'dark' ? '#ECF0F8' : '#0C1428', pointBorderWidth: 2, pointRadius: 4, tension: 0.4 },

              { label: 'Avg Monthly Income', data: Array(12).fill(apps.reduce((s, a) => s + a.income, 0) / (apps.length || 1) / 12), borderColor: theme === 'dark' ? '#A4B0C8' : '#5E6E88', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0 }

            ]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: g } }, y: { grid: { color: g }, beginAtZero: false, min: 40000, ticks: { callback: v => v.toLocaleString() } } } }

        });

      }

    } else if (page === 'bd-portfolio') {

      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';

      Chart.defaults.font.family = "'Outfit',sans-serif";

      const ctxAsset = document.getElementById('cht-asset-alloc');

      if (ctxAsset) {

        purposeChart = new Chart(ctxAsset, { // assetChart

          type: 'doughnut',

          data: {

            labels: ['Fixed Income', 'Equity MF', 'Direct Equity', 'Govt Bonds'],

            datasets: [{ data: [35, 30, 20, 15], backgroundColor: ['#38C9B0', '#4BA8E0', '#C9973C', '#A072F0'], borderWidth: 0 }]

          },

          options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }

        });

      }

      const ctxValue = document.getElementById('cht-value-invest');

      if (ctxValue) {

        creditChart = new Chart(ctxValue, { // valueChart

          type: 'line',

          data: {

            labels: ['2019', '2020', '2021', '2022', '2023', '2024'],

            datasets: [{

              label: 'Portfolio Value',

              data: [320000, 345000, 390000, 410000, 480000, 516200],

              borderColor: '#38C9B0', borderWidth: 2, tension: 0.4, fill: true, backgroundColor: 'rgba(56,201,176,0.1)'

            }]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: g }, ticks: { callback: v => '₹' + v / 1000 + 'K' } } } }

        });

      }

    } else if (page === 'bd-risk' && result) {

      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

      const lineC = theme === 'dark' ? '#ECF0F8' : '#0C1428';

      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';

      Chart.defaults.font.family = "'Outfit',sans-serif";

      const ctxAmort = document.getElementById('cht-amort-assess');

      if (ctxAmort) {

        let labels = [], pData = [], iData = [], bData = [];

        let step = Math.max(1, Math.floor(result.sched.rows.length / 24));

        result.sched.rows.forEach((m, i) => {

          if (i % step === 0 || i === result.sched.rows.length - 1) {

            labels.push(`M${m.m}`);

            pData.push(m.p);

            iData.push(m.i);

            bData.push(m.bal);

          }

        });

        rocChart = new Chart(ctxAmort, { // Reusing rocChart variable to hold amortChart temporarily for cleanup

          type: 'bar',

          data: {

            labels,

            datasets: [

              { type: 'line', label: 'Balance', data: bData, borderColor: lineC, borderWidth: 2, pointRadius: 0, tension: 0, yAxisID: 'y1' },

              { type: 'bar', label: 'Principal', data: pData, backgroundColor: '#4BA8E0', stacked: true, yAxisID: 'y' },

              { type: 'bar', label: 'Interest', data: iData, backgroundColor: '#E85475', stacked: true, yAxisID: 'y' }

            ]

          },

          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: g }, ticks: { callback: v => v >= 1000 ? '₹' + fmtK(v) : v } }, y1: { position: 'right', grid: { display: false }, ticks: { callback: v => v >= 1000 ? '₹' + fmtK(v) : v } } } }

        });

      }

    }

    return () => {

      [trendChart, distChart, purposeChart, creditChart, empChart, dtiChart, coefChart, emiChart, stackedChart, trend18Chart, sectorChart, geoChart, stressChart, rocChart, portPurposeChart, portRiskChart].forEach(c => c && c.destroy());

    };

  }, [page, theme, result, apps]);

  return (

    <div className="app-shell active">

      <Sidebar

        user={user}

        activePage={page}

        setPage={setPage}

        onLogout={onLogout}

        role="bank"

        theme={theme}

        toggleTheme={toggleTheme}

      />

      <div className="main-area">

        <div className="page-content">

          {page === 'bd-overview' && (

            <div className="fade-in">

              <div className="section-header">

                <div>

                  <h1 className="section-title">Institutional <span style={{ color: 'var(--gold)' }}>Dashboard</span></h1>

                  <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>Real-time risk metrics and application pipeline.</p>

                </div>

                <div style={{ display: 'flex', gap: '12px' }}>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>

                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 10px var(--teal)' }}></div>

                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>System Active</span>

                  </div>

                </div>

              </div>

              <div className="kpi-row">
                <div className="kpi sky fade-up">
                  <div className="kpi-lbl">Total Applications</div>
                  <div className="kpi-val">{(stats.total || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 600 }}>Active in Pipeline</div>
                </div>

                <div className="kpi teal fade-up fade-up-d1">
                  <div className="kpi-lbl">Approved Applications</div>
                  <div className="kpi-val">{(stats.approved || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>● Sanctioned & Dispatched</div>
                </div>

                <div className="kpi rose fade-up fade-up-d2">
                  <div className="kpi-lbl">High Risk Cases</div>
                  <div className="kpi-val">{(stats.high_risk || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--rose)', fontWeight: 600 }}>● Included across workflow states</div>
                </div>

                <div className="kpi gold fade-up fade-up-d3">
                  <div className="kpi-lbl">Review Queue</div>
                  <div className="kpi-val">{(stats.review_queue || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 600 }}>● Manual review pending</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>

                <div className="card fade-up fade-up-d1">

                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Monthly Volume & Default Rate</div></div>

                  <div style={{ height: '300px', position: 'relative' }}><canvas id="cht-trend"></canvas></div>

                </div>

                <div className="card fade-up fade-up-d2">

                  <div className="ch"><div className="ct">Risk Distribution</div></div>

                  <div style={{ height: '220px', position: 'relative' }}><canvas id="cht-dist"></canvas></div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38C9B0' }}></div>
                      <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Low Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9973C' }}></div>
                      <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Medium Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E85475' }}></div>
                      <span style={{ color: 'var(--slate)', fontWeight: 600 }}>High Risk</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginTop: '16px' }}>Thresholds from notebook cell 47: [0, 0.3, 0.6, 1]</div>

                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-teal"></div>Application Volume by Loan Purpose</div></div>

                  <div style={{ height: '260px', position: 'relative' }}><canvas id="cht-purpose"></canvas></div>

                </div>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Credit Score Distribution</div></div>

                  <div style={{ height: '260px', position: 'relative' }}><canvas id="cht-credit"></canvas></div>

                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '12px' }}>Actual rates from 255K records</div>

                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '20px', marginBottom: '20px' }}>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-gold"></div>By Employment Type</div></div>

                  <div style={{ height: '200px', position: 'relative' }}><canvas id="cht-emp"></canvas></div>

                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '12px' }}>Unemployed 13.6% - Full-time 9.5%</div>

                </div>

                <div className="card fade-up">

                  <div style={{ height: '200px', position: 'relative', background: 'var(--gold-glow)', borderRadius: '8px', padding: '10px' }}><canvas id="cht-dti"></canvas></div>

                </div>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-rose"></div>Top Feature Coefficients</div></div>

                  <div style={{ height: '200px', position: 'relative' }}><canvas id="cht-coef"></canvas></div>

                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '12px' }}>From actual LogReg model coefficients</div>

                </div>

              </div>

            </div>

          )}

          {page === 'bd-assess' && (

            <div className="fade-in">

              <div className="card glass mb18">

                <div className="ch">

                  <div className="ct" style={{ fontSize: '18px', fontWeight: 800 }}><div className="pip pip-sky" />Manual Underwriting Intelligence</div>

                  <div className="mbadge mbadge-gold">Algorithmic Risk Unit · LR-B1</div>

                </div>

                <div className="form-grid">

                  <div className="fg-sec"><div className="fg-sec-dot" />BORROWER INFORMATION</div>

                  <div className="fg-full">

                    <div className="flab">BORROWER FULL NAME</div>

                    <input type="text" className="finput" placeholder="Enter name" value={formData.fullName} onChange={e => update('fullName', e.target.value)} />

                  </div>

                  <div>

                    <div className="flab">AGE</div>

                    <input type="number" className="finput" value={formData.age} onChange={e => update('age', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">CREDIT SCORE</div>

                    <input type="number" className="finput" value={formData.credit} onChange={e => update('credit', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">EDUCATION</div>

                    <select className="fselect" value={formData.edu} onChange={e => update('edu', e.target.value)}>

                      <option value="hs">High School</option><option value="bach">Bachelor's</option><option value="mast">Master's</option><option value="phd">PhD</option>

                    </select>

                  </div>

                  <div>

                    <div className="flab">MARITAL STATUS</div>

                    <select className="fselect" value={formData.marital} onChange={e => update('marital', e.target.value)}>

                      <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>

                    </select>

                  </div>

                  <div>

                    <div className="flab">STATE</div>

                    <select className="fselect" value={formData.state} onChange={e => update('state', e.target.value)}>

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

                    <div className="flab">ANNUAL INCOME (₹)</div>

                    <input type="number" className="finput" value={formData.income} onChange={e => update('income', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">LOAN AMOUNT (₹)</div>

                    <input type="number" className="finput" value={formData.loanAmt} onChange={e => update('loanAmt', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">DTI RATIO <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '10px', marginLeft: '4px' }}>(OPTIONAL · decimal 0.0–1.0)</span></div>

                    <input type="number" step="0.01" className="finput" value={formData.dti} onChange={e => update('dti', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">CREDIT LINES <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '10px', marginLeft: '4px' }}>(OPTIONAL)</span></div>

                    <input type="number" className="finput" value={formData.lines} onChange={e => update('lines', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />LOAN DETAILS</div>

                  <div>

                    <div className="flab">LOAN PURPOSE</div>

                    <div className="combo-field">

                      <select className="combo-select" value={formData.purpose} onChange={e => update('purpose', e.target.value)}>

                        <option value="home">Home</option><option value="auto">Auto</option><option value="education">Education</option><option value="business">Business</option><option value="personal">Personal</option><option value="medical">Medical</option><option value="travel">Travel</option>

                      </select>

                    </div>

                  </div>

                  <div>

                    <div className="flab">LOAN TERM <span className="combo-tag">+ ENTER MANUALLY</span></div>

                    <div className="combo-field">

                      <select className="combo-select" value={formData.term} onChange={e => update('term', e.target.value)}>

                        <option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="60">60 months</option><option value="custom">Enter manually...</option>

                      </select>

                      <input type="number" className={`combo-manual ${formData.term === 'custom' ? 'show' : ''}`} value={formData.customTerm} onChange={e => update('customTerm', e.target.value)} onWheel={e => e.target.blur()} />

                    </div>

                  </div>

                  <div>

                    <div className="flab">INTEREST RATE %</div>

                    <input type="number" step="0.01" className="finput" value={formData.rate} onChange={e => update('rate', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />EMPLOYMENT</div>

                  <div>

                    <div className="flab">EMPLOYMENT TYPE</div>

                    <select className="fselect" value={formData.empType} onChange={e => update('empType', e.target.value)}>

                      <option value="full">Full-time</option><option value="part">Part-time</option><option value="self">Self-employed</option><option value="unemployed">Unemployed</option>

                    </select>

                  </div>

                  <div>

                    <div className="flab">MONTHS EMPLOYED</div>

                    <input type="number" className="finput" value={formData.empl} onChange={e => update('empl', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">JOB CHANGES (LAST 5 YRS)</div>

                    <input type="number" className="finput" value={formData.jobChanges} onChange={e => update('jobChanges', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />BINARY FLAGS</div>

                  <div>

                    <div className="flab">HAS MORTGAGE?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.mort === 'Y' ? 'on' : ''}`} onClick={() => tog('mort', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.mort === 'N' ? 'on' : ''}`} onClick={() => tog('mort', 'N')}>No</button>

                    </div>

                  </div>

                  <div>

                    <div className="flab">HAS DEPENDENTS?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.dep === 'Y' ? 'on' : ''}`} onClick={() => tog('dep', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.dep === 'N' ? 'on' : ''}`} onClick={() => tog('dep', 'N')}>No</button>

                    </div>

                  </div>

                  <div>

                    <div className="flab">HAS CO-SIGNER?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.co === 'Y' ? 'on' : ''}`} onClick={() => tog('co', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.co === 'N' ? 'on' : ''}`} onClick={() => tog('co', 'N')}>No</button>

                    </div>

                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />EXISTING LOAN (EXTERNAL)</div>

                  <div>

                    <div className="flab">OTHER BANK LOAN?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.extloan === 'Y' ? 'on' : ''}`} onClick={() => tog('extloan', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.extloan === 'N' ? 'on' : ''}`} onClick={() => tog('extloan', 'N')}>No</button>

                    </div>

                  </div>

                  {flags.extloan === 'Y' && (

                    <>

                      <div>

                        <div className="flab">BANK NAME</div>

                        <div className="combo-field">

                          <select className="combo-select" value={formData.bank} onChange={e => update('bank', e.target.value)}>

                            <option value="SBI">State Bank of India</option><option value="HDFC">HDFC Bank</option><option value="ICICI">ICICI Bank</option><option value="custom">Manual Entry</option>

                          </select>

                          <input className={`combo-manual ${formData.bank === 'custom' ? 'show' : ''}`} placeholder="Enter bank name" value={formData.customBank} onChange={e => update('customBank', e.target.value)} />

                        </div>

                      </div>

                      <div>

                        <div className="flab">INTEREST RATE (%)</div>

                        <input type="number" className="finput" placeholder="e.g. 8.5" value={formData.extRate} onChange={e => update('extRate', e.target.value)} />

                      </div>

                      <div>

                        <div className="flab">LOAN PURPOSE</div>

                        <div className="combo-field">

                          <select className="combo-select" value={formData.extPurpose} onChange={e => update('extPurpose', e.target.value)}>

                            <option value="home">Home Loan</option><option value="auto">Auto Loan</option><option value="education">Education</option><option value="custom">Manual Entry</option>

                          </select>

                          <input className={`combo-manual ${formData.extPurpose === 'custom' ? 'show' : ''}`} placeholder="Enter purpose" value={formData.customExtPurpose} onChange={e => update('customExtPurpose', e.target.value)} />

                        </div>

                      </div>

                    </>

                  )}

                  <div className="fg-full" style={{ marginTop: '10px' }}>

                    <button className="btn-main" onClick={handleSubmit}>Assess Default Risk</button>

                  </div>

                </div>

              </div>

              {result && (
                <div ref={resultRef} className="fade-in" style={{ marginTop: '30px', scrollMarginTop: '100px' }}>

                  {/* VERDICT BANNER */}

                  <div style={{

                    background: result.level === 'low' ? 'linear-gradient(135deg, #0D9488 0%, #10B981 100%)' : result.level === 'med' ? 'linear-gradient(135deg, #997D30 0%, #C3A44F 100%)' : 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)',

                    padding: '24px 32px', borderRadius: '16px', marginBottom: '24px', color: '#fff',

                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',

                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'

                  }}>

                    <div>

                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, letterSpacing: '2px', marginBottom: '4px' }}>UNDERWRITING VERDICT</div>

                      <div style={{ fontSize: '24px', fontWeight: 900 }}>

                        {result.level === 'low' ? 'Recommended for Approval' : result.level === 'med' ? 'Manual Underwriter Review Required' : 'High Probability of Default - Reject'}

                      </div>

                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, backdropFilter: 'blur(10px)' }}>

                      CONFIDENCE:{(100 - (Math.abs(50 - result.pct) * 0.5)).toFixed(1)}%

                    </div>

                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.1fr', gap: '24px' }}>

                    {/* RISK GAUGE */}

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

                      <div className="ch" style={{ width: '100%' }}>

                        <div className="ct"><div className="pip pip-sky" />Risk Probability</div>

                        <div className="mbadge mbadge-sky">σ(wᵀx+b)</div>

                      </div>

                      <div style={{ position: 'relative', margin: '30px 0' }}>

                        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>

                          <circle cx="90" cy="90" r="80" fill="none" stroke="var(--bg2)" strokeWidth="12" />

                          <circle cx="90" cy="90" r="80" fill="none" stroke={result.pct < 31 ? '#10B981' : result.pct < 61 ? '#F59E0B' : '#EF4444'} strokeWidth="12"
                            strokeDasharray={`${(result.pct / 100) * 502} 502`}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 1s ease' }}
                          />

                        </svg>

                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>

                          <div style={{ fontSize: '42px', fontWeight: 900, color: 'var(--navy)', lineHeight: 1 }}>{result.pct}%</div>

                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginTop: '4px' }}>DEFAULT RISK</div>

                        </div>

                      </div>

                      <div style={{ width: '100%', padding: '16px', background: 'var(--ice)', borderRadius: '12px', textAlign: 'left' }}>

                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>
                          {result.pct < 31 ? 'Low Exposure' : result.pct < 61 ? 'Elevated Concern' : 'Critical Risk'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--slate)', lineHeight: 1.4 }}>
                          {result.pct < 31 ? 'Financial indicators demonstrate strong stability.' : result.pct < 61 ? 'Several features indicate potential instability.' : 'Significant default indicators detected across multiple variables.'}
                        </div>

                      </div>

                    </div>

                    {/* REPAYMENT */}

                    <div className="card">

                      <div className="ch">

                        <div className="ct"><div className="pip pip-teal" />Repayment Structure</div>

                        <div className="mbadge mbadge-teal">Amortization Summary</div>

                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '30px' }}>

                        <div style={{ background: 'var(--ice)', padding: '20px 12px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>

                          <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--sky)', marginBottom: '4px' }}>₹{fmt(result.emi)}</div>

                          <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Monthly EMI</div>

                        </div>

                        <div style={{ background: 'var(--ice)', padding: '20px 12px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>

                          <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--teal)', marginBottom: '4px' }}>₹{fmt(formData.loanAmt)}</div>

                          <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Principal</div>

                        </div>

                        <div style={{ background: 'var(--ice)', padding: '20px 12px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>

                          <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--rose)', marginBottom: '4px' }}>₹{fmt(result.totalInt)}</div>

                          <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Interest</div>

                        </div>

                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>

                          <span style={{ fontSize: '13px', color: 'var(--slate)' }}>Total Repayment Amount</span>

                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>₹{fmt(result.totalRepay)}</span>

                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>

                          <span style={{ fontSize: '13px', color: 'var(--slate)' }}>Interest to Principal Ratio</span>

                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--rose)' }}>{((result.totalInt / formData.loanAmt) * 100).toFixed(1)}%</span>

                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>

                          <span style={{ fontSize: '13px', color: 'var(--slate)' }}>Affordability (EMI/Income)</span>

                          <span style={{ fontSize: '14px', fontWeight: 800, color: (result.emi / (formData.income / 12) > 0.5) ? 'var(--rose)' : 'var(--teal)' }}>

                            {formData.income > 0 ? ((result.emi / (formData.income / 12)) * 100).toFixed(1) + '%' : 'N/A'}

                          </span>

                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>

                          <span style={{ fontSize: '13px', color: 'var(--slate)' }}>Assigned Interest Rate</span>

                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>{formData.rate}% p.a.</span>

                        </div>

                      </div>

                    </div>

                    {/* FEATURE INFLUENCE */}

                    <div className="card">

                      <div className="ch">

                        <div className="ct"><div className="pip pip-gold" />Feature Influence</div>

                        <div className="mbadge mbadge-gold">Model Coefficients</div>

                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        {(() => {

                          const maxVal = Math.max(...result.features.map(f => Math.abs(f.val)), 1.0);

                          return result.features.map(f => (

                            <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800 }}>

                                <span style={{ color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.name}</span>

                                <span style={{ color: f.type === 'pos' ? 'var(--rose)' : 'var(--teal)' }}>{f.type === 'pos' ? '+ RISK' : '- RISK'}</span>

                              </div>

                              <div style={{ width: '100%', height: '6px', background: 'var(--bg2)', borderRadius: '3px', position: 'relative' }}>

                                <div style={{

                                  position: 'absolute', height: '100%', borderRadius: '3px',

                                  background: f.type === 'pos' ? 'var(--rose)' : 'var(--teal)',

                                  width: `${(Math.abs(f.val) / maxVal) * 50}%`,

                                  ...(f.type === 'pos' ? { left: '50%' } : { right: '50%' })

                                }} />

                              </div>

                            </div>

                          ));

                        })()}

                      </div>

                    </div>

                  </div>

                  {/* AMORTIZATION SCHEDULE */}

                  <div className="card fade-up" style={{ marginTop: '24px', animationDelay: '0.3s' }}>

                    <div className="ch">

                      <div className="ct"><div className="pip pip-sky"></div>Full Amortization Schedule</div>

                      <div className="mbadge mbadge-sky">₹{fmt(result.totalRepay)} ·{formData.rate}% ·{formData.term}mo</div>

                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '30px', border: '1px solid var(--border)', borderRadius: '12px' }}>

                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>

                        <thead style={{ position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>

                          <tr style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>

                            <th style={{ padding: '16px 24px' }}>Month</th>

                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>EMI Amount</th>

                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Principal</th>

                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Interest</th>

                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Balance</th>

                          </tr>

                        </thead>

                        <tbody style={{ fontSize: '13px' }}>

                          {result.sched.rows.map(m => (

                            <tr key={m.m} style={{ borderBottom: '1px solid var(--border)' }}>

                              <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>Mo{m.m}</td>

                              <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace", color: '#4BA8E0' }}>₹{fmt(m.p)}</td>

                              <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--rose)' }}>₹{fmt(m.i)}</td>

                              <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text2)' }}>₹{fmt(m.bal)}</td>

                            </tr>

                          ))}

                        </tbody>

                      </table>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#4BA8E0', borderRadius: '2px' }}></span> Principal</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: 'var(--rose)', borderRadius: '2px' }}></span> Interest</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '16px', height: '2px', background: 'var(--text)' }}></span> Balance</span>

                    </div>

                    <div style={{ height: '300px', position: 'relative' }}><canvas id="cht-amort-assess"></canvas></div>

                  </div>

                </div>

              )}

            </div>

          )}

          {page === 'bd-underwriting' && (

            <div className="fade-in">

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                  <h1 className="h-serif" style={{ fontSize: '32px' }}>Loan <span style={{ color: 'var(--gold)' }}>History</span></h1>
                  <p style={{ color: 'var(--slate)', fontSize: '14px', marginTop: '4px' }}>Review and manage incoming loan applications.</p>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', opacity: 0.5 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '10px 16px 10px 36px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', width: '280px', background: 'var(--bg)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  />
                </div>
              </div>

              <div className="card mb18 fade-up"><div className="ch"><div className="ct"><div className="pip pip-sky"></div>Recent Loan Assessments</div></div>

                <table className="tbl" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>

                  <thead>

                    <tr style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)' }}>

                      <th style={{ padding: '12px 14px' }}>Loan ID</th>

                      <th style={{ padding: '12px 14px' }}>Borrower Name</th>

                      <th style={{ padding: '12px 14px' }}>Purpose</th>

                      <th style={{ padding: '12px 14px' }}>Bank</th>

                      <th style={{ padding: '12px 14px' }}>State</th>

                      <th style={{ padding: '12px 14px' }}>Loan Amt</th>

                      <th style={{ padding: '12px 14px' }}>Credit</th>

                      <th style={{ padding: '12px 14px' }}>DTI</th>

                      <th style={{ padding: '12px 14px' }}>Prob.</th>

                      <th style={{ padding: '12px 14px' }}>Status</th>

                      <th style={{ padding: '12px 14px' }}>Assigned Rate</th>

                    </tr>

                  </thead>

                  <tbody style={{ fontSize: '13px', color: 'var(--text)' }}>

                    {(() => {
                      const filtered = apps.filter(a =>
                        (a.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.loan_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.target_bank || '').toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <tr><td colSpan="11" style={{ padding: '48px 40px', textAlign: 'center' }}>

                            <div style={{ fontSize: '28px', marginBottom: '12px' }}>📁</div>

                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '8px' }}>

                              No matching applications found

                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>

                              Try refining your search query or check the "Customers" tab for all records.

                            </div>

                          </td></tr>
                        );
                      }

                      return filtered.map(a => (

                        <tr
                          key={a.id}
                          style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => {
                            setSelectedApp(a);
                            setAssignedRate(a.assigned_rate || '');
                            setAssignedTerm(a.term || '');
                            setReviewNote(a.bank_decision_note || '');
                            setDecisionMode(null);
                          }}
                        >

                          <td style={{ padding: '16px 14px', fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', color: 'var(--sky)', fontWeight: 700 }}>{a.loan_id || `--`}</td>

                          <td style={{ padding: '16px 14px', fontWeight: 600 }}>{a.full_name || 'Manual Entry'}</td>

                          <td style={{ padding: '16px 14px' }}>{a.loan_purpose}</td>

                          <td style={{ padding: '16px 14px' }}>

                            {a.target_bank ? (

                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '8px', background: 'rgba(75,168,224,0.1)', color: 'var(--sky)', border: '1px solid rgba(75,168,224,0.2)' }}>

                                {a.target_bank}

                              </span>

                            ) : <span style={{ color: 'var(--text3)', fontSize: '11px' }}>—</span>}

                          </td>

                          <td style={{ padding: '16px 14px', fontWeight: 600 }}>{a.state || 'N/A'}</td>

                          <td style={{ padding: '16px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>₹{fmt(a.loan_amount)}</td>

                          <td style={{ padding: '16px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>{a.credit_score}</td>

                          <td style={{ padding: '16px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>{a.dti != null ? ((a.dti) * 100).toFixed(1) + '%' : '-'}</td>

                          <td style={{ padding: '16px 14px', fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: a.probability < 0.3 ? 'var(--teal)' : a.probability < 0.6 ? 'var(--gold)' : 'var(--rose)' }}>{a.probability != null ? Math.round(a.probability * 100) + '%' : '-'}</td>

                          <td style={{ padding: '16px 14px' }}>

                            <span className={`bpill ${a.status === 'Approved' ? 'bp-teal' : a.status === 'Rejected' ? 'bp-rose' : a.status === 'Under Review' ? 'bp-gold' : 'bp-sky'}`} style={{ padding: '4px 10px' }}>

                              {a.status || 'Pending'}

                            </span>

                          </td>

                          <td style={{ padding: '16px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>{a.assigned_rate ? `${a.assigned_rate}%` : '-'}</td>

                        </tr>

                      ));
                    })()}

                  </tbody>

                </table>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-teal"></div>Bill Payment History (36 months)</div></div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: '4px', marginBottom: '14px' }}>

                    {Array.from({ length: 36 }).map((_, i) => {

                      const isLate = i === 5 || i === 18 || i === 31;

                      const isMissed = i === 10;

                      return <div key={i} style={{ aspectRatio: '1', borderRadius: '3px', background: isMissed ? '#E85475' : isLate ? '#C9973C' : '#38C9B0', opacity: 0.8 }}></div>

                    })}

                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text3)' }}>

                    <div style={{ display: 'flex', gap: '12px' }}>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38C9B0' }}></span> On-time</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9973C' }}></span> Late</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E85475' }}></span> Missed</span>

                    </div>

                    <div style={{ fontFamily: "'IBM Plex Mono',monospace" }}>Payment Score: 93/100</div>

                  </div>

                </div>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-gold"></div>EMI Payment Regularity (12 mo)</div></div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: '#38C9B0' }}></span> On-time</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: '#C9973C' }}></span> Late/Partial</span>

                  </div>

                  <div style={{ height: '180px', position: 'relative' }}><canvas id="cht-emi-reg"></canvas></div>

                </div>

              </div>

            </div>

          )}

          {page === 'bd-reports' && (

            <div className="fade-in">

              <div className="card mb18 fade-up" style={{ padding: '30px' }}>

                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Business Insights</div>

                <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '24px' }}>Portfolio-level analytics and model performance tracking.</div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg2)', minWidth: '140px' }}>

                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>₹{apps.length > 0 ? (apps.reduce((s, a) => s + a.loan_amount, 0) / 10000000).toFixed(2) : '0.00'}Cr</div>

                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Portfolio</div>

                  </div>

                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg2)', minWidth: '140px' }}>

                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>{apps.length > 0 ? ((apps.reduce((s, a) => s + a.probability, 0) / apps.length) * 100).toFixed(1) : '0.0'}%</div>

                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Default Rate</div>

                  </div>

                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg2)', minWidth: '140px' }}>

                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>0.760</div>

                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Model ROC-AUC</div>

                  </div>

                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg2)', minWidth: '140px' }}>

                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>₹{apps.length > 0 ? (apps.reduce((s, a) => s + a.loan_amount, 0) / apps.length / 1000).toFixed(1) : '0.0'}L</div>

                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Loan Size</div>

                  </div>

                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', marginBottom: '20px' }}>

                <div className="card fade-up">

                  <div style={{ fontSize: '20px', marginBottom: '12px' }}></div>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Net Interest Income</div>

                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '28px', fontWeight: 700, color: 'var(--teal)', marginBottom: '8px' }}>₹{apps.length > 0 ? (apps.reduce((s, a) => s + (a.loan_amount * a.interest_rate / 100), 0) / 10000000).toFixed(2) : '0.00'}Cr</div>

                  <div style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 600, marginBottom: '16px' }}>Live computation</div>

                  <div style={{ height: '4px', background: 'var(--bg2)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: '73%', height: '100%', background: 'var(--teal)' }}></div></div>

                </div>

                <div className="card fade-up">

                  <div style={{ fontSize: '20px', marginBottom: '12px' }}></div>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>NPA Exposure</div>

                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '28px', fontWeight: 700, color: 'var(--rose)', marginBottom: '8px' }}>₹{apps.length > 0 ? (apps.filter(a => (a.risk_category || '').toLowerCase().includes('high')).reduce((s, a) => s + (a.loan_amount || 0), 0) / 10000000).toFixed(2) : '0.00'}Cr</div>

                  <div style={{ fontSize: '12px', color: 'var(--rose)', fontWeight: 600, marginBottom: '16px' }}>High risk sum</div>

                  <div style={{ height: '4px', background: 'var(--bg2)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: '27%', height: '100%', background: 'var(--rose)' }}></div></div>

                </div>

                <div className="card fade-up">

                  <div style={{ fontSize: '20px', marginBottom: '12px' }}></div>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Recovery Rate</div>

                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '28px', fontWeight: 700, color: 'var(--gold)', marginBottom: '8px' }}>{apps.length > 0 ? '64.2%' : '0.0%'}</div>

                  <div style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 600, marginBottom: '16px' }}>{apps.length > 0 ? 'Standard baseline' : 'No data available'}</div>

                  <div style={{ height: '4px', background: 'var(--bg2)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: apps.length > 0 ? '64%' : '0%', height: '100%', background: 'var(--gold)' }}></div></div>

                </div>

                <div className="card fade-up">

                  <div style={{ fontSize: '20px', marginBottom: '12px' }}></div>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Model Precision</div>

                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '28px', fontWeight: 700, color: 'var(--sky)', marginBottom: '8px' }}>{apps.length > 0 ? '64%' : '0%'}</div>

                  <div style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 600, marginBottom: '16px' }}>{apps.length > 0 ? 'On default class' : 'Model inactive'}</div>

                  <div style={{ height: '4px', background: 'var(--bg2)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: apps.length > 0 ? '64%' : '0%', height: '100%', background: 'var(--sky)' }}></div></div>

                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', marginBottom: '20px' }}>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-rose"></div>Risk Category Breakdown</div></div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.04)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--teal)', marginBottom: '4px' }}>{apps.length > 0 ? ((apps.filter(a => (a.risk_category || '').toLowerCase().includes('low')).length / apps.length) * 100).toFixed(0) : '0'}%</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Low Risk</div>
                    </div>
                    <div style={{ border: '1px solid rgba(201,151,60,0.2)', background: 'rgba(201,151,60,0.04)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>{apps.length > 0 ? ((apps.filter(a => (a.risk_category || '').toLowerCase().includes('medium')).length / apps.length) * 100).toFixed(0) : '0'}%</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Medium Risk</div>
                    </div>
                    <div style={{ border: '1px solid rgba(232,84,117,0.2)', background: 'rgba(232,84,117,0.04)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--rose)', marginBottom: '4px' }}>{apps.length > 0 ? ((apps.filter(a => (a.risk_category || '').toLowerCase().includes('high')).length / apps.length) * 100).toFixed(0) : '0'}%</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>High Risk</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--teal)', marginBottom: '2px' }}>{apps.filter(a => (a.status || '').toLowerCase() === 'approved').length.toLocaleString()}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Approved</div>
                    </div>
                    <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--gold)', marginBottom: '2px' }}>{apps.filter(a => (a.status || '').toLowerCase() === 'pending' || (a.status || '').toLowerCase() === 'manual_review').length.toLocaleString()}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Under Review</div>
                    </div>
                    <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--rose)', marginBottom: '2px' }}>{apps.filter(a => (a.status || '').toLowerCase() === 'rejected').length.toLocaleString()}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Declined</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#38C9B0' }}></span> Low</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#C9973C' }}></span> Medium</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#E85475' }}></span> High</span>

                  </div>

                  <div style={{ height: '180px', position: 'relative' }}><canvas id="cht-stacked-risk"></canvas></div>

                </div>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Default Rate Trend (18 months)</div></div>

                  <div style={{ height: '260px', position: 'relative' }}><canvas id="cht-trend-18"></canvas></div>

                  <div style={{ marginTop: '20px', background: 'rgba(56,201,176,0.08)', border: '1px solid rgba(56,201,176,0.2)', borderRadius: '10px', padding: '16px' }}>

                    <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: '13px', marginBottom: '6px' }}>Improving Trend</div>

                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>Default rate declined 0.8pp over 18 months, driven by improved credit score filtering and co-signer policies.</div>

                  </div>

                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', marginBottom: '20px' }}>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-gold"></div>Sector Exposure & Default Rate</div></div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>

                    {['Home', 'Education', 'Other', 'Business'].map((purpose, i) => {

                      const filtered = apps.filter(a => a.loan_purpose === purpose);

                      const amt = filtered.reduce((s, a) => s + a.loan_amount, 0);

                      const avgProb = filtered.length > 0 ? (filtered.reduce((s, a) => s + a.probability, 0) / filtered.length) * 100 : 0;

                      const icons = { Home: '', Education: '', Other: '', Business: '' };

                      const colors = { Home: 'var(--teal)', Education: 'var(--teal)', Other: 'var(--gold)', Business: 'var(--rose)' };

                      return (

                        <div key={purpose} style={{ display: 'flex', alignItems: 'center' }}>

                          <div style={{ width: '30px', fontSize: '18px' }}>{icons[purpose]}</div>

                          <div style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{purpose} Loans</div>

                          <div style={{ width: '80px', textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace", fontSize: '12px' }}>₹{(amt / 10000000).toFixed(1)}Cr</div>

                          <div style={{ width: '100px', margin: '0 16px', height: '4px', background: 'var(--bg2)', borderRadius: '2px', position: 'relative' }}>

                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${avgProb}%`, background: colors[purpose], borderRadius: '2px' }}></div>

                          </div>

                          <div style={{ width: '40px', textAlign: 'right', fontWeight: 700, fontSize: '12px', color: colors[purpose] }}>{avgProb.toFixed(1)}%</div>

                        </div>

                      );

                    })}

                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#E85475' }}></span> Home</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#4BA8E0' }}></span> Education</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#38C9B0' }}></span> Auto</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#A072F0' }}></span> Other</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#C9973C' }}></span> Business</span>

                  </div>

                  <div style={{ height: '180px', position: 'relative' }}><canvas id="cht-sector-doughnut"></canvas></div>

                </div>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Geographic Distribution</div></div>

                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '24px' }}>

                    <thead>

                      <tr style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)' }}>

                        <th style={{ padding: '8px', fontWeight: 700 }}></th><th style={{ padding: '8px', textAlign: 'right' }}>Volume</th><th style={{ padding: '8px', textAlign: 'right' }}>Default%</th><th style={{ padding: '8px', textAlign: 'right' }}>Avg Loan</th>

                      </tr>

                    </thead>

                    <tbody style={{ fontSize: '13px', color: 'var(--text)' }}>

                      {['MH', 'KA', 'TN', 'DL', 'GJ', 'Other'].map(code => {

                        const filtered = apps.filter(a => (a.state || 'MH') === code);

                        const names = { MH: 'Maharashtra', KA: 'Karnataka', TN: 'Tamil Nadu', DL: 'Delhi', GJ: 'Gujarat', Other: 'Others' };

                        const avgLoan = filtered.length > 0 ? (filtered.reduce((s, a) => s + a.loan_amount, 0) / filtered.length / 1000).toFixed(1) : '0';

                        const avgProb = filtered.length > 0 ? (filtered.reduce((s, a) => s + a.probability, 0) / filtered.length * 100).toFixed(1) : '0';

                        return (

                          <tr key={code} style={{ borderBottom: '1px solid var(--border)' }}>

                            <td style={{ padding: '12px 8px', fontWeight: 600 }}>{names[code]}</td>

                            <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace" }}>{filtered.length}</td>

                            <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace" }}>{avgProb}%</td>

                            <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace" }}>₹{avgLoan}L</td>

                          </tr>

                        );

                      })}

                    </tbody>

                  </table>

                  <div style={{ height: '240px', position: 'relative' }}><canvas id="cht-geo-bar"></canvas></div>

                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-rose"></div>EMI-to-Income Stress Distribution</div></div>

                  <div style={{ height: '240px', position: 'relative' }}><canvas id="cht-stress-bar"></canvas></div>

                </div>

                <div className="card fade-up">

                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Model ROC Curve (approximated)</div></div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', border: '2px solid var(--text)', background: 'transparent' }}></span> GroundZero LR (AUC=0.760)</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', border: '2px dashed #E85475', background: 'transparent' }}></span> Random (AUC=0.500)</span>

                  </div>

                  <div style={{ height: '240px', position: 'relative' }}><canvas id="cht-roc-curve"></canvas></div>

                </div>

              </div>

            </div>

          )}

          {page === 'bd-behaviour' && (

            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              <div className="card fade-up">

                <div className="ch"><div className="ct"><div className="pip pip-sky" />Job Stability Analysis</div></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>

                  <div style={{ background: 'rgba(56,201,176,0.06)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>

                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '24px', fontWeight: 700, color: 'var(--teal)', marginBottom: '4px' }}>

                      {apps.length > 0 ? Math.round(apps.reduce((s, a) => s + (a.months_employed || 0), 0) / apps.length) : 0}mo

                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>Avg Tenure</div>

                  </div>

                  <div style={{ background: 'var(--bg2)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>

                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '24px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>

                      {apps.length > 0 ? (apps.reduce((s, a) => s + (a.job_changes || 0), 0) / apps.length).toFixed(1) : 0}

                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>Avg Changes</div>

                  </div>

                  <div style={{ background: 'rgba(75,168,224,0.06)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>

                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '24px', fontWeight: 700, color: '#4BA8E0', marginBottom: '4px' }}>

                      {apps.filter(a => a.months_employed > 24).length > apps.length / 2 ? 'High' : 'Med'}

                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>Stability</div>

                  </div>

                </div>

                <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '1px solid var(--border)', marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {apps.slice(0, 3).map((a, i) => (

                    <div key={i} style={{ position: 'relative' }}>

                      <div style={{ position: 'absolute', left: '-25px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: a.months_employed > 24 ? 'var(--teal)' : 'var(--rose)', border: '2px solid var(--panel)' }}></div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>

                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{a.full_name || 'Manual Entry'}</span>

                        <span style={{ fontSize: '10px', background: a.months_employed > 24 ? 'rgba(56,201,176,0.1)' : 'rgba(232,84,117,0.1)', color: a.months_employed > 24 ? 'var(--teal)' : 'var(--rose)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>{a.months_employed}mo</span>

                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'IBM Plex Mono',monospace" }}>{a.employment_type || 'Full-time'} ·{a.job_changes || 0} changes</div>

                    </div>

                  ))}

                </div>

              </div>

              <div className="card fade-up fade-up-d1">

                <div className="ch"><div className="ct"><div className="pip pip-gold" />Behaviour Signals</div></div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

                  {apps.filter(a => a.months_employed > 36).length > apps.length / 2 && <span style={{ fontSize: '11px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(56,201,176,0.2)' }}>● High Tenure Avg</span>}

                  {apps.filter(a => a.job_changes <= 1).length > apps.length / 2 && <span style={{ fontSize: '11px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(56,201,176,0.2)' }}>● Stable Employment</span>}

                  {apps.filter(a => a.has_cosigner === 'Yes').length > 0 && <span style={{ fontSize: '11px', background: 'rgba(75,168,224,0.1)', color: '#4BA8E0', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(75,168,224,0.2)' }}>● Co-Signer Presence</span>}

                  {apps.length > 5 && <span style={{ fontSize: '11px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(56,201,176,0.2)' }}>● Consistent Flow</span>}

                  <span style={{ fontSize: '11px', background: 'rgba(75,168,224,0.1)', color: '#4BA8E0', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(75,168,224,0.2)' }}>● Verification Active</span>

                </div>

              </div>

              <div className="card fade-up fade-up-d2">

                <div className="ch"><div className="ct"><div className="pip pip-teal" />Bill Payment Radar</div></div>

                <div style={{ height: '300px', position: 'relative' }}><canvas id="cht-radar-behavior"></canvas></div>

              </div>

              <div className="card fade-up fade-up-d3">

                <div className="ch"><div className="ct"><div className="pip pip-sky" />Spending vs Income (12 mo)</div></div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>

                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '2px', borderBottom: '2px dashed var(--text)', background: 'transparent' }}></span> Monthly Income</span>

                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', border: '2px solid var(--text)', background: 'transparent' }}></span> Spending</span>

                </div>

                <div style={{ height: '280px', position: 'relative' }}><canvas id="cht-spend-behavior"></canvas></div>

              </div>

            </div>

          )}

          {page === 'bd-portfolio' && (
            <div className="fade-in">

              {/* ── KPI Stats Row ── */}
              <div className="kpi-row" style={{ marginBottom: '28px' }}>
                <div className="kpi sky fade-up">
                  <div className="kpi-lbl">Total Loan Book</div>
                  <div className="kpi-val" style={{ color: 'var(--sky)' }}>₹{(apps.reduce((s, a) => s + a.loan_amount, 0) / 100000).toFixed(1)}L</div>
                  <div className="kpi-sub">{apps.length} Active Accounts</div>
                </div>
                <div className="kpi teal fade-up fade-up-d1">
                  <div className="kpi-lbl">Avg. Interest Rate</div>
                  <div className="kpi-val" style={{ color: 'var(--teal)' }}>
                    {apps.length > 0 ? (apps.reduce((s, a) => s + (parseFloat(a.interest_rate) || 12.4), 0) / apps.length).toFixed(1) : '0.0'}%
                  </div>
                  <div className="kpi-sub">Annualized Returns</div>
                </div>
                <div className="kpi gold fade-up fade-up-d2">
                  <div className="kpi-lbl">Total Customers</div>
                  <div className="kpi-val" style={{ color: 'var(--gold)' }}>{apps.length}</div>
                  <div className="kpi-sub">Registered Borrowers</div>
                </div>
                <div className="kpi rose fade-up fade-up-d3">
                  <div className="kpi-lbl">Portfolio Health</div>
                  <div className="kpi-val" style={{ 
                    color: apps.some(a => a.risk_category === 'High') ? 'var(--rose)' : 'var(--teal)', 
                    fontSize: '24px' 
                  }}>
                    {apps.length === 0 ? 'N/A' : (apps.some(a => a.risk_category === 'High') ? 'At Risk' : 'Stable')}
                  </div>
                  <div className="kpi-sub">System-wide Status</div>
                </div>
              </div>

              {/* ── Customer Directory ── */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>Customer Directory</div>
                    <div style={{ fontSize: '13px', color: 'var(--slate)', fontWeight: 400 }}>Select a customer to review their full loan profile and risk assessment.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', opacity: 0.5 }}></span>
                      <input
                        type="text"
                        placeholder="Search by name or Loan ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: '8px 16px 8px 32px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', outline: 'none', width: '220px', background: 'var(--bg)' }}
                      />
                    </div>
                    <div style={{ background: 'var(--ice)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, color: 'var(--navy)', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {apps.filter(a =>
                        (a.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.loan_id || '').toLowerCase().includes(searchQuery.toLowerCase())
                      ).length} CUSTOMERS
                    </div>
                  </div>
                </div>

                {/* Customer Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>

                  {apps.filter(a =>
                    (a.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (a.loan_id || '').toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((a, i) => {
                    const risk = (a.risk_category || 'Low').toLowerCase();
                    const riskColor = risk.includes('low') ? { bg: 'rgba(13,148,136,.08)', color: '#0d9488', border: 'rgba(13,148,136,.2)' }
                      : risk.includes('medium') ? { bg: 'rgba(217,119,6,.08)', color: '#b45309', border: 'rgba(217,119,6,.2)' }
                        : { bg: 'rgba(225,29,72,.08)', color: '#be123c', border: 'rgba(225,29,72,.2)' };
                    const initial = a.full_name?.trim().charAt(0).toUpperCase() || 'U';
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedApp(a)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '16px',
                          background: '#fff', border: '1px solid var(--border)',
                          borderRadius: '16px', padding: '20px 24px',
                          cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(14,165,233,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
                      >
                        {/* Avatar */}
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--sky) 0%, var(--navy) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(14,165,233,0.2)' }}>
                          {initial}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--navy)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px' }}>
                            {a.full_name || 'Unknown Customer'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 10px', borderRadius: '8px', background: riskColor.bg, color: riskColor.color }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                              {a.risk_category || 'Low'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--sky)', fontWeight: 800, letterSpacing: '0.5px', fontFamily: "'IBM Plex Mono',monospace" }}>{a.loan_id || `#${a.id}`}</span>
                          </div>
                        </div>

                        {/* View Button */}
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--sky)', background: 'rgba(14,165,233,0.05)', padding: '8px 16px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease', border: '1px solid rgba(14,165,233,0.1)' }}>
                          Review
                        </div>
                      </div>
                    );
                  })}

                  {apps.filter(a =>
                    (a.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (a.loan_id || '').toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 40px', background: 'var(--ice)', borderRadius: '14px', color: 'var(--slate)', fontSize: '14px', fontWeight: 500, border: '1px dashed var(--border-strong)' }}>
                        No customers found matching your search.
                      </div>
                    )}

                </div>
              </div>

            </div>
          )}

          {page === 'bd-risk' && (

            <div className="fade-in">

              <div className="card glass mb18">

                <div className="ch">

                  <div className="ct"><div className="pip pip-sky" />Manual Underwriting Assessment</div>

                  <div className="mbadge mbadge-gold">Algorithmic Risk Unit · LR-B1</div>

                </div>

                <div className="form-grid">

                  <div className="fg-sec"><div className="fg-sec-dot" />BORROWER INFORMATION</div>

                  <div className="fg-full">

                    <div className="flab">BORROWER FULL NAME</div>

                    <input type="text" className="finput" placeholder="Enter name" value={formData.fullName} onChange={e => update('fullName', e.target.value)} />

                  </div>

                  <div>

                    <div className="flab">AGE</div>

                    <input type="number" className="finput" value={formData.age} onChange={e => update('age', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">CREDIT SCORE</div>

                    <input type="number" className="finput" value={formData.credit} onChange={e => update('credit', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">EDUCATION</div>

                    <select className="fselect" value={formData.edu} onChange={e => update('edu', e.target.value)}>

                      <option value="hs">High School</option><option value="bach">Bachelor's</option><option value="mast">Master's</option><option value="phd">PhD</option>

                    </select>

                  </div>

                  <div>

                    <div className="flab">MARITAL STATUS</div>

                    <select className="fselect" value={formData.marital} onChange={e => update('marital', e.target.value)}>

                      <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>

                    </select>

                  </div>

                  <div>

                    <div className="flab">STATE</div>

                    <select className="fselect" value={formData.state} onChange={e => update('state', e.target.value)}>

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

                    <div className="flab">ANNUAL INCOME (₹)</div>

                    <input type="number" className="finput" value={formData.income} onChange={e => update('income', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">LOAN AMOUNT (₹)</div>

                    <input type="number" className="finput" value={formData.loanAmt} onChange={e => update('loanAmt', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px', marginBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div className="flab">DTI RATIO <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '10px', marginLeft: '4px' }}>(OPTIONAL · decimal 0.0–1.0)</span></div>
                        <input type="number" step="0.01" className="finput" value={formData.dti} onChange={e => update('dti', e.target.value)} onWheel={e => e.target.blur()} />
                      </div>
                      <div>
                        <div className="flab">CREDIT LINES <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '10px', marginLeft: '4px' }}>(OPTIONAL)</span></div>
                        <input type="number" className="finput" value={formData.lines} onChange={e => update('lines', e.target.value)} onWheel={e => e.target.blur()} />
                      </div>
                    </div>
                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />LOAN DETAILS</div>

                  <div>

                    <div className="flab">LOAN PURPOSE <span className="combo-tag">+ ENTER MANUALLY</span></div>

                    <div className="combo-field">

                      <select className="combo-select" value={formData.purpose} onChange={e => update('purpose', e.target.value)}>

                        <option value="home">Home</option><option value="auto">Auto</option><option value="education">Education</option><option value="business">Business</option><option value="medical">Medical</option><option value="personal">Personal Loan</option><option value="custom">Enter manually...</option>

                      </select>

                      <input className={`combo-manual ${formData.purpose === 'custom' ? 'show' : ''}`} placeholder="e.g. Wedding, Machinery..." value={formData.customPurpose} onChange={e => update('customPurpose', e.target.value)} />

                    </div>

                  </div>

                  <div>

                    <div className="flab">LOAN TERM <span className="combo-tag">+ ENTER MANUALLY</span></div>

                    <div className="combo-field">

                      <select className="combo-select" value={formData.term} onChange={e => update('term', e.target.value)}>

                        <option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="60">60 months</option><option value="custom">Enter manually...</option>

                      </select>

                      <input type="number" className={`combo-manual ${formData.term === 'custom' ? 'show' : ''}`} value={formData.customTerm} onChange={e => update('customTerm', e.target.value)} onWheel={e => e.target.blur()} />

                    </div>

                  </div>

                  <div>

                    <div className="flab">INTEREST RATE %</div>

                    <input type="number" step="0.01" className="finput" value={formData.rate} onChange={e => update('rate', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />EMPLOYMENT</div>

                  <div>

                    <div className="flab">EMPLOYMENT TYPE</div>

                    <select className="fselect" value={formData.empType} onChange={e => update('empType', e.target.value)}>

                      <option value="full">Full-time</option><option value="part">Part-time</option><option value="self">Self-employed</option><option value="unemployed">Unemployed</option>

                    </select>

                  </div>

                  <div>

                    <div className="flab">MONTHS EMPLOYED</div>

                    <input type="number" className="finput" value={formData.empl} onChange={e => update('empl', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div>

                    <div className="flab">JOB CHANGES (LAST 5 YRS)</div>

                    <input type="number" className="finput" value={formData.jobChanges} onChange={e => update('jobChanges', e.target.value)} onWheel={e => e.target.blur()} />

                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />BINARY FLAGS</div>

                  <div>

                    <div className="flab">HAS MORTGAGE?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.mort === 'Y' ? 'on' : ''}`} onClick={() => tog('mort', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.mort === 'N' ? 'on' : ''}`} onClick={() => tog('mort', 'N')}>No</button>

                    </div>

                  </div>

                  <div>

                    <div className="flab">HAS DEPENDENTS?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.dep === 'Y' ? 'on' : ''}`} onClick={() => tog('dep', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.dep === 'N' ? 'on' : ''}`} onClick={() => tog('dep', 'N')}>No</button>

                    </div>

                  </div>

                  <div>

                    <div className="flab">HAS CO-SIGNER?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.co === 'Y' ? 'on' : ''}`} onClick={() => tog('co', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.co === 'N' ? 'on' : ''}`} onClick={() => tog('co', 'N')}>No</button>

                    </div>

                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />EXISTING LOAN (EXTERNAL)</div>

                  <div>

                    <div className="flab">OTHER BANK LOAN?</div>

                    <div className="ftog">

                      <button className={`ftog-btn ${flags.extloan === 'Y' ? 'on' : ''}`} onClick={() => tog('extloan', 'Y')}>Yes</button>

                      <button className={`ftog-btn ${flags.extloan === 'N' ? 'on' : ''}`} onClick={() => tog('extloan', 'N')}>No</button>

                    </div>

                  </div>

                  {flags.extloan === 'Y' && (

                    <>

                      <div>

                        <div className="flab">BANK NAME</div>

                        <div className="combo-field">

                          <select className="combo-select" value={formData.bank} onChange={e => update('bank', e.target.value)}>

                            <option value="SBI">State Bank of India</option><option value="HDFC">HDFC Bank</option><option value="ICICI">ICICI Bank</option><option value="custom">Ã¢Å“ÂÃ¯Â¸Â Manual Entry</option>

                          </select>

                          <input className={`combo-manual ${formData.bank === 'custom' ? 'show' : ''}`} placeholder="Enter bank name" value={formData.customBank} onChange={e => update('customBank', e.target.value)} />

                        </div>

                      </div>

                      <div>

                        <div className="flab">INTEREST RATE (%)</div>

                        <input type="number" className="finput" placeholder="e.g. 8.5" value={formData.extRate} onChange={e => update('extRate', e.target.value)} />

                      </div>

                      <div>

                        <div className="flab">LOAN PURPOSE</div>

                        <div className="combo-field">

                          <select className="combo-select" value={formData.extPurpose} onChange={e => update('extPurpose', e.target.value)}>

                            <option value="home">Ã°Å¸ÂÂ  Home Loan</option><option value="auto">Auto Loan</option><option value="education">Education</option><option value="custom">Ã¢Å“ÂÃ¯Â¸Â Manual Entry</option>

                          </select>

                          <input className={`combo-manual ${formData.extPurpose === 'custom' ? 'show' : ''}`} placeholder="Enter purpose" value={formData.customExtPurpose} onChange={e => update('customExtPurpose', e.target.value)} />

                        </div>

                      </div>

                    </>

                  )}

                  <div className="fg-full" style={{ marginTop: '10px' }}>

                    <button className="btn-main" onClick={handleSubmit}>Assess Default Risk</button>

                  </div>

                </div>

              </div>

              {result && (
                <div ref={resultRef} className="fade-in" style={{ marginTop: "30px", scrollMarginTop: '100px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.1fr', gap: '24px' }}>
                    <div className="card fade-in">
                      <div className="ch">
                        <div className="ct"><div className="pip pip-sky" />Risk Assessment</div>

                        <div className="mbadge" style={{ background: 'rgba(201,151,60,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,151,60,0.2)', fontFamily: "'JetBrains Mono',monospace" }}>σ(wᵀx+b)</div>

                      </div>

                      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>

                        <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: `conic-gradient(${result.level === 'low' ? 'var(--teal)' : result.level === 'med' ? 'var(--gold)' : 'var(--rose)'} ${isNaN(result.pct) ? 0 : result.pct}%, var(--bg2) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>

                          <div style={{ width: '136px', height: '136px', borderRadius: '50%', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces',serif", fontSize: '48px', fontWeight: 700, color: result.level === 'low' ? 'var(--teal)' : result.level === 'med' ? 'var(--gold)' : 'var(--rose)' }}>

                            {isNaN(result.pct) ? '—' : result.pct + '%'}

                          </div>

                        </div>

                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px' }}>DEFAULT PROBABILITY · σ(WᵀX+B)</div>

                        <div style={{ width: '100%', height: '4px', background: 'var(--bg2)', borderRadius: '2px', marginTop: '20px', overflow: 'hidden' }}>

                          <div style={{ height: '100%', width: `${result.pct}%`, background: result.level === 'low' ? 'var(--teal)' : result.level === 'med' ? 'var(--gold)' : 'var(--rose)' }}></div>

                        </div>

                      </div>

                      <div style={{ padding: '16px', background: result.level === 'low' ? 'rgba(56,201,176,0.06)' : result.level === 'med' ? 'rgba(201,151,60,0.06)' : 'rgba(232,84,117,0.06)', border: `1px solid ${result.level === 'low' ? 'rgba(56,201,176,0.2)' : result.level === 'med' ? 'rgba(201,151,60,0.2)' : 'rgba(232,84,117,0.2)'}`, borderRadius: '10px' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: result.level === 'low' ? 'var(--teal)' : result.level === 'med' ? 'var(--gold)' : 'var(--rose)', marginBottom: '8px', fontSize: '14px' }}>

                          {result.level === 'low' ? 'Low Risk — Likely Approved' : result.level === 'med' ? 'Medium Risk — Manual Review' : 'High Risk — Likely Rejected'}

                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>

                          {result.level === 'low' ? 'Strong repayment profile. Default probability below 30%. Loan recommended for approval.' :

                            result.level === 'med' ? 'Borderline profile. Default probability between 30% and 60%. Manual underwriter review required.' :

                              'Weak repayment profile. Default probability exceeds 60%. Loan recommended for rejection.'}

                        </div>

                      </div>

                    </div>

                    <div className="card fade-in" style={{ animationDelay: '0.1s' }}>

                      <div className="ch"><div className="ct"><div className="pip pip-gold" />Loan Repayment Breakdown</div></div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>

                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 12px', textAlign: 'center' }}>

                          <div style={{ fontFamily: "'Fraunces',serif", fontSize: '20px', fontWeight: 700, color: '#4BA8E0', marginBottom: '6px' }}>₹{isNaN(result.emi) ? '—' : fmt(result.emi)}</div>

                          <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly EMI</div>

                        </div>

                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 12px', textAlign: 'center' }}>

                          <div style={{ fontFamily: "'Fraunces',serif", fontSize: '20px', fontWeight: 700, color: 'var(--teal)', marginBottom: '6px' }}>₹{isNaN(formData.loanAmt) || !formData.loanAmt ? '—' : fmt(formData.loanAmt)}</div>

                          <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Principal</div>

                        </div>

                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 12px', textAlign: 'center' }}>

                          <div style={{ fontFamily: "'Fraunces',serif", fontSize: '20px', fontWeight: 700, color: 'var(--rose)', marginBottom: '6px' }}>₹{isNaN(result.totalInt) ? '—' : fmt(result.totalInt)}</div>

                          <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Interest</div>

                        </div>

                      </div>

                      <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '10px' }}>

                        <div style={{ width: `${isNaN(result.pPct) ? 0 : result.pPct}%`, background: '#4BA8E0' }}></div>

                        <div style={{ width: `${isNaN(result.iPct) ? 0 : result.iPct}%`, background: 'var(--rose)' }}></div>

                      </div>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text)', fontWeight: 600, marginBottom: '24px' }}>

                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: '#4BA8E0', borderRadius: '2px' }}></span> Principal{isNaN(result.pPct) ? 0 : result.pPct.toFixed(0)}%</span>

                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: 'var(--rose)', borderRadius: '2px' }}></span> Interest{isNaN(result.iPct) ? 0 : result.iPct.toFixed(0)}%</span>

                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Total Repayment</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>₹{isNaN(result.totalRepay) ? '—' : fmt(result.totalRepay)}</span></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Interest Cost</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--rose)' }}>₹{isNaN(result.totalInt) ? '—' : fmt(result.totalInt)}</span></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Rate (p.a.)</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{formData.rate || '0'}%</span></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Term</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{formData.term || '0'} months</span></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>

                          <span style={{ color: 'var(--text2)' }}>EMI / Monthly Income</span>

                          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: (formData.income > 0 && ((result.emi / (formData.income / 12)) * 100) > 50) ? 'var(--gold)' : 'var(--teal)' }}>

                            {formData.income > 0 && !isNaN(result.emi) ? ((result.emi / (formData.income / 12)) * 100).toFixed(1) + '%' : 'N/A'}

                          </span>

                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>

                          <span style={{ color: 'var(--text2)' }}>Loan / Annual Income</span>

                          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--teal)' }}>

                            {formData.income > 0 && !isNaN(formData.loanAmt) ? (formData.loanAmt / formData.income).toFixed(2) + 'x' : 'N/A'}

                          </span>

                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text2)' }}>Purpose</span><span>{formData.purpose || 'N/A'}</span></div>

                      </div>

                    </div>

                    <div className="card fade-in" style={{ animationDelay: '0.2s' }}>

                      <div className="ch"><div className="ct"><div className="pip pip-teal" />Feature Influence (Real Coefficients)</div></div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                        {(() => {

                          const maxVal = Math.max(...result.features.map(f => Math.abs(f.val)), 1.0);

                          return result.features.map(f => (

                            <div key={f.name} style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>

                              <div style={{ width: '130px', color: 'var(--text2)' }}>{f.name}</div>

                              <div style={{ width: '45px', fontSize: '10px', fontWeight: 600, color: f.type === 'pos' ? 'var(--rose)' : 'var(--teal)' }}>{f.type === 'pos' ? '+ risk' : '- risk'}</div>

                              <div style={{ flex: 1, height: '6px', background: 'var(--bg2)', borderRadius: '3px', position: 'relative' }}>

                                <div style={{

                                  position: 'absolute', height: '100%', borderRadius: '3px',

                                  background: f.type === 'pos' ? 'var(--rose)' : 'var(--teal)',

                                  width: `${(Math.abs(f.val) / maxVal) * 50}%`,

                                  ...(f.type === 'pos' ? { left: '50%' } : { right: '50%' })

                                }} />

                              </div>

                              <div style={{ width: '50px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text3)' }}>{f.val > 0 ? `+${f.val}` : f.val}</div>

                            </div>

                          ));

                        })()}

                      </div>

                    </div>

                  </div>

                </div>

              )}

              {result && (
                <div ref={resultRef} className="fade-in" style={{ marginTop: "30px", scrollMarginTop: '100px' }}>

                  <div className="card fade-up" style={{ marginTop: '20px', animationDelay: '0.3s' }}>

                    <div className="ch">

                      <div className="ct"><div className="pip pip-sky"></div>Full Amortization Schedule</div>

                      <div className="mbadge" style={{ background: 'transparent', color: 'var(--text2)', border: 'none' }}>₹{fmt(result.totalRepay)} ·{formData.rate}% ·{formData.term}mo</div>

                    </div>

                    <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '30px', border: '1px solid var(--border)', borderRadius: '8px' }}>

                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>

                        <thead style={{ position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>

                          <tr style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>

                            <th style={{ padding: '14px 20px' }}>Month</th>

                            <th style={{ padding: '14px 20px', textAlign: 'right' }}>EMI</th>

                            <th style={{ padding: '14px 20px', textAlign: 'right' }}>Principal</th>

                            <th style={{ padding: '14px 20px', textAlign: 'right' }}>Interest</th>

                            <th style={{ padding: '14px 20px', textAlign: 'right' }}>Balance</th>

                          </tr>

                        </thead>

                        <tbody style={{ fontSize: '13px' }}>

                          {result.sched.rows.map(m => (

                            <tr key={m.m} style={{ borderBottom: '1px solid var(--border)' }}>

                              <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>Mo{m.m}</td>

                              <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>₹{fmt(m.emi)}</td>

                              <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: '#4BA8E0' }}>₹{fmt(m.p)}</td>

                              <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: 'var(--rose)' }}>₹{fmt(m.i)}</td>

                              <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text2)' }}>₹{fmt(m.bal)}</td>

                            </tr>

                          ))}

                        </tbody>

                      </table>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#4BA8E0', borderRadius: '2px' }}></span> Principal</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: 'var(--rose)', borderRadius: '2px' }}></span> Interest</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '16px', height: '2px', background: 'var(--text)' }}></span> Balance</span>

                    </div>

                    <div style={{ height: '300px', position: 'relative' }}><canvas id="cht-amort-assess"></canvas></div>

                  </div>

                </div>

              )}

            </div>

          )}

          {page === 'pg-suggest' && (

            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

              <div>

                <div className="h-serif" style={{ marginBottom: '24px', fontSize: '32px' }}>

                  Bank Recommendations

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  <div className="card fade-up" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>

                    <div style={{ display: 'flex', gap: '16px' }}>

                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56,201,176,0.1)', flexShrink: 0 }} />

                      <div>

                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Improve Credit Score to 700+</div>

                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>Model coef: -0.121. Every 50pt improvement reduces risk. Keep credit utilization below 30%, pay dues on time for 3+ months.</div>

                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>

                      </div>

                    </div>

                  </div>

                  <div className="card fade-up fade-up-d1" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>

                    <div style={{ display: 'flex', gap: '16px' }}>

                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56,201,176,0.1)', flexShrink: 0 }} />

                      <div>

                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Reduce Loan-to-Income Ratio</div>

                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>Loan_Income_Ratio coef: +0.470 — strong positive predictor. Keep loan amount below 1.5x annual income.</div>

                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>

                      </div>

                    </div>

                  </div>

                  <div className="card fade-up fade-up-d2" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>

                    <div style={{ display: 'flex', gap: '16px' }}>

                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56,201,176,0.1)', flexShrink: 0 }} />

                      <div>

                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Negotiate Lower Interest Rate</div>

                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>InterestRate coef: +0.459 — 2nd strongest predictor. Lower rates directly reduce the model score. Co-signers help secure better rates.</div>

                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>

                      </div>

                    </div>

                  </div>

                  <div className="card fade-up fade-up-d3" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>

                    <div style={{ display: 'flex', gap: '16px' }}>

                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56,201,176,0.1)', flexShrink: 0 }} />

                      <div>

                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Stay Employed Longer</div>

                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>MonthsEmployed coef: -0.339 — 4th strongest. Avoid switching jobs within 6 months before application. 48+ months significantly lowers probability.</div>

                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>

                      </div>

                    </div>

                  </div>

                  <div className="card fade-up fade-up-d4" style={{ border: '1px solid rgba(201,151,60,0.2)', background: 'rgba(201,151,60,0.02)', padding: '20px' }}>

                    <div style={{ display: 'flex', gap: '16px' }}>

                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(201,151,60,0.1)', flexShrink: 0 }} />

                      <div>

                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Add a Co-Signer</div>

                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>HasCoSigner_Yes coef: -0.142. Choose co-signer with 720+ credit score, full-time employment, stable income history.</div>

                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(201,151,60,0.1)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Med Impact</div>

                      </div>

                    </div>

                  </div>

                  <div className="card fade-up fade-up-d5" style={{ border: '1px solid rgba(201,151,60,0.2)', background: 'rgba(201,151,60,0.02)', padding: '20px' }}>

                    <div style={{ display: 'flex', gap: '16px' }}>

                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(201,151,60,0.1)', flexShrink: 0 }} />

                      <div>

                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Choose Home Loan Purpose</div>

                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>LoanPurpose_Home coef: -0.078. Lowest risk purpose (10.2% default rate). Business loans: +0.023 coef. Reframe if purpose is flexible.</div>

                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(201,151,60,0.1)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Med Impact</div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              <div className="card fade-up fade-up-d1" style={{ position: 'sticky', top: '20px', height: 'max-content' }}>

                <div className="ch"><div className="ct"><div className="pip pip-gold" />Eligibility Optimizer</div></div>

                <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '24px' }}>Adjust variables — real model recalculates instantly</div>

                <div style={{ marginBottom: '16px' }}>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Loan Amount</div>

                  <input type="range" min="5000" max="2500000" value={opt.loanAmt} onChange={e => setOpt({ ...opt, loanAmt: +e.target.value })} style={{ width: '100%', marginBottom: '4px', accentColor: 'var(--gold)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text2)' }}>

                    <span>5K</span><span>₹{fmt(opt.loanAmt)}</span><span>25L</span>

                  </div>

                </div>

                <div style={{ marginBottom: '16px' }}>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Credit Score</div>

                  <input type="range" min="300" max="850" value={opt.credit} onChange={e => setOpt({ ...opt, credit: +e.target.value })} style={{ width: '100%', marginBottom: '4px', accentColor: 'var(--gold)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text2)' }}>

                    <span>300</span><span>{opt.credit}</span><span>850</span>

                  </div>

                </div>

                <div style={{ marginBottom: '16px' }}>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>DTI Ratio</div>

                  <input type="range" min="0" max="0.9" step="0.01" value={opt.dti} onChange={e => setOpt({ ...opt, dti: +e.target.value })} style={{ width: '100%', marginBottom: '4px', accentColor: 'var(--gold)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text2)' }}>

                    <span>0.00</span><span>{opt.dti.toFixed(2)}</span><span>0.90</span>

                  </div>

                </div>

                <div style={{ marginBottom: '24px' }}>

                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Employment Type</div>

                  <select className="fselect" style={{ width: '100%', fontSize: '12px' }} value={opt.empType} onChange={e => setOpt({ ...opt, empType: e.target.value })}>

                    <option value="full">Full-time</option>

                    <option value="self">Self-employed</option>

                    <option value="part">Part-time</option>

                    <option value="unemp">Unemployed</option>

                  </select>

                </div>

                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '30px' }}>

                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '48px', fontWeight: 700, color: optProb < 0.3 ? 'var(--teal)' : optProb < 0.6 ? 'var(--gold)' : 'var(--rose)', marginBottom: '4px' }}>

                    {Math.round(optProb * 100)}%

                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 600, color: optProb < 0.3 ? 'var(--teal)' : optProb < 0.6 ? 'var(--gold)' : 'var(--rose)' }}>

                    {optProb < 0.3 ? 'Low Risk' : optProb < 0.6 ? 'Medium Risk' : 'High Risk'}

                  </div>

                </div>

                <div style={{ height: '240px', position: 'relative', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginLeft: '30px' }}>

                  <div style={{ position: 'absolute', left: '-30px', top: '-6px', bottom: '-6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text3)', fontFamily: "'IBM Plex Mono',monospace" }}>

                    <span>80%</span><span>70%</span><span>60%</span><span>50%</span><span>40%</span><span>30%</span><span>20%</span><span>10%</span><span>0%</span>

                  </div>

                  {Array.from({ length: 9 }).map((_, i) => (

                    <div key={i} style={{ position: 'absolute', top: `${(i / 8) * 100}%`, left: 0, right: 0, height: '1px', background: 'var(--border)' }}></div>

                  ))}

                  {optProb * 100 >= 0 && optProb * 100 <= 80 && (

                    <div style={{ position: 'absolute', left: '10px', bottom: `${((optProb * 100) / 80) * 100}%`, width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--text)', background: 'var(--bg)', transform: 'translateY(5px)' }} />

                  )}

                  {optProb * 100 > 80 && (

                    <div style={{ position: 'absolute', left: '10px', top: '0', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--rose)', background: 'var(--bg)', transform: 'translateY(-5px)' }} />

                  )}

                  <div style={{ position: 'absolute', left: '12px', bottom: '-20px', fontSize: '10px', color: 'var(--text3)', fontFamily: "'IBM Plex Mono',monospace" }}>#1</div>

                </div>

              </div>

            </div>

          )}

          <button className="ai-fab" onClick={() => setIsAiOpen(!isAiOpen)}>

            <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>A</span>

          </button>

          <ArthaAI isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

          {toast && (

            <div className={`toast-notify ${toast.type}`} style={{ position: 'fixed', bottom: '30px', right: '30px', padding: '12px 24px', background: toast.type === 'success' ? 'var(--teal)' : 'var(--rose)', color: '#000', borderRadius: '12px', fontWeight: 800, zIndex: 10000, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }}>

              {toast.type === 'success' ? '' : ''}{toast.message}

            </div>

          )}

          {selectedApp && (
            <div className="modal-overlay active" onClick={() => { setSelectedApp(null); setDecisionMode(null); }} style={{ backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.6)' }}>
              <div className="modal-content glass-modal animate-scale" style={{ maxWidth: '1140px', width: '95vw', padding: '0', background: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

                {/* STICKY TOP BAR */}

                <div className="modal-header-premium" style={{ background: 'var(--navy)', color: '#fff', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>

                  <div>
                    <div style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '10px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                      Bank Analyst Portal · {selectedApp.loan_id || `Case #${selectedApp.id}`}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>{selectedApp.full_name || 'Manual Entry'}</div>
                      <div className={`status-chip sc-${(selectedApp.risk_category || 'pending').toLowerCase()}`} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)' }}>{selectedApp.risk_category || 'Pending'} Risk</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', gap: '24px', alignItems: 'center' }}>

                    <div>

                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>APPLICATION STATUS</div>

                      <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{selectedApp.status || 'Under Review'}</div>

                    </div>

                    <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>

                    <button className="modal-close" style={{ position: 'static', color: '#fff', opacity: 0.8, background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.8'} onClick={() => { setSelectedApp(null); setDecisionMode(null); }}>✕</button>

                  </div>

                </div>

                <div className="modal-body-p" style={{ padding: '0', display: 'flex', height: 'calc(90vh - 86px)' }}>

                  {/* LEFT MAIN CONTENT (Scrollable) */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: '#fafbfc' }}>
                    
                    {/* 1. BORROWER OVERVIEW GRID */}
                    <div style={{ marginBottom: '40px' }}>
                      <div className="p-sec-title" style={{ fontSize: '15px', marginBottom: '20px', color: 'var(--navy)', fontWeight: 800 }}>Borrower Summary Overview</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                        {[
                          { l: 'Age', v: `${selectedApp.age}y` },
                          { l: 'Credit Score', v: selectedApp.credit_score, c: 'var(--gold)' },
                          { l: 'Annual Income', v: `₹${fmtK(selectedApp.income)}` },
                          { l: 'DTI Ratio', v: `${((selectedApp.dti || 0) * 100).toFixed(1)}%` },
                          { l: 'Loan Requested', v: `₹${fmt(selectedApp.loan_amount)}`, c: 'var(--teal)' },
                          { l: 'Loan Purpose', v: selectedApp.loan_purpose || 'Other' },
                          { l: 'Employment', v: selectedApp.employment_type },
                          { l: 'Loan Term', v: `${selectedApp.term}m`, c: 'var(--sky)' },
                          { l: 'Months Employed', v: `${selectedApp.months_employed}m` },
                          { l: 'Education', v: selectedApp.education || "Bachelor's" },
                          { l: 'Co-Signer', v: selectedApp.has_cosigner || 'No' },
                          { l: 'Dependents', v: selectedApp.has_dependents || 'No' },
                          { l: 'Loan ID', v: selectedApp.loan_id || 'N/A', c: 'var(--sky)' }
                        ].map((s, i) => (
                          <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.l}</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: s.c || 'var(--navy)' }}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. TRANSACTION INTELLIGENCE PANEL (DEMO MODE: STATIC) */}
                    <div style={{ marginBottom: '40px' }}>
                      <div className="p-sec-title" style={{ fontSize: '15px', marginBottom: '20px', color: 'var(--navy)', fontWeight: 800 }}>Institutional Transaction Intelligence</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        {[
                          { l: 'Monthly Inflow (Avg)', v: `₹${fmtK(selectedApp.income / 12)}`, c: 'var(--teal)' },
                          { l: 'Monthly Outflow (Avg)', v: `₹${fmtK((selectedApp.income / 12) * 0.62)}`, c: 'var(--rose)' },
                          { l: 'Bounced Transactions', v: '0 (Clean)', c: 'var(--teal)' },
                          { l: 'Salary Consistency', v: 'High (Verified)', c: 'var(--navy)' },
                          { l: 'Investment Portfolio', v: `₹${fmtK(245000)}`, c: 'var(--sky)' },
                          { l: 'Behavioral Score', v: '94/100', c: 'var(--teal)' }
                        ].map((s, i) => (
                          <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: `4px solid ${s.c || 'var(--sky)'}` }}>
                            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.l}</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy)' }}>{s.v}</div>
                          </div>
                        ))}
                      </div>

                      <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '20px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Recent Transaction History (Verified Source)</div>
                          <span style={{ fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 }}>Account: XXXX8921</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--slate)', fontSize: '11px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {behData?.txs?.map((tx, idx) => (
                                <tr key={idx} style={{ borderBottom: idx === behData.txs.length - 1 ? 'none' : '1px solid var(--bg)' }}>
                                  <td style={{ padding: '12px 8px', color: 'var(--slate)' }}>{tx.date}</td>
                                  <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--navy)' }}>{tx.category}</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: tx.type === 'Credit' ? 'var(--teal)' : 'var(--navy)' }}>
                                    {tx.type === 'Credit' ? '+' : '-'}₹{fmt(tx.amount)}
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: tx.type === 'Credit' ? 'rgba(56,201,176,0.1)' : 'rgba(15,23,42,0.05)', color: tx.type === 'Credit' ? 'var(--teal)' : 'var(--slate)' }}>
                                      {tx.type.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>AI Behavioral Insights & Anomalies</div>
                          <span style={{ fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 }}>Model V4.2</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {behData?.insights?.map((insight, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--navy)' }}>
                              <span style={{ color: insight.type === 'pos' ? 'var(--teal)' : 'var(--rose)' }}>{insight.type === 'pos' ? '✓' : '⚠'}</span> {insight.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3. FINANCIAL INTELLIGENCE (CHARTS) */}
                    <div style={{ marginBottom: '40px' }}>
                      <div className="p-sec-title" style={{ fontSize: '14px', marginBottom: '24px', color: 'var(--navy)', border: 'none', padding: 0 }}>Visual Behavioral Intelligence</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '20px' }}>Asset Portfolio Structure</div>
                          <div style={{ height: '220px', position: 'relative' }}><canvas id="modal-cht-asset"></canvas></div>
                        </div>
                        <div className="card" style={{ padding: '32px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: '20px' }}>Inflow vs Outflow Dynamics</div>
                          <div style={{ height: '260px', position: 'relative' }}><canvas id="modal-cht-trend"></canvas></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDEBAR (Institutional Underwriting Controls) */}
                  <div style={{ width: '420px', borderLeft: '1px solid var(--border)', background: 'var(--panel)', padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px', position: 'sticky', top: 0, height: '100%', overflowY: 'auto' }}>
                    
                    <div className="p-sec-title" style={{ fontSize: '14px', color: 'var(--navy)', border: 'none', padding: 0, flexShrink: 0 }}>Underwriter Workspace</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* STEP 1: ASSIGN RATE (Only show if pending) */}
                      {selectedApp && selectedApp.status === 'Pending' && (
                        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '24px', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Sanction Parameters</div>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: '8px' }}>Institutional Interest Rate (%)</label>
                            <div style={{ position: 'relative' }}>
                              <input 
                                type="number" 
                                step="0.05" 
                                placeholder="e.g. 11.5" 
                                className="f-inp" 
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border)', fontWeight: 800, fontSize: '18px', background: 'var(--bg)' }} 
                                value={assignedRate} 
                                onChange={e => setAssignedRate(e.target.value)} 
                              />
                              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--slate)' }}>%</span>
                            </div>
                          </div>
                          <button 
                            className="confirm-btn" 
                            style={{ width: '100%', padding: '18px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', opacity: isAnalyzing ? 0.7 : 1 }} 
                            disabled={isAnalyzing}
                            onClick={handleAnalyze}
                          >
                            {isAnalyzing ? 'Analyzing Metrics...' : 'Analyze Application'}
                          </button>
                        </div>
                      )}

                      {/* STEP 2: ML OUTPUT PANEL */}
                      {analysisResult ? (
                        <div className="animate-fade" style={{ background: '#fff', border: '1px solid var(--border)', padding: '30px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>AI Underwriting Analysis</div>
                          
                          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                              <path 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke={analysisResult.default_probability < 31 ? '#10B981' : analysisResult.default_probability < 61 ? '#F59E0B' : '#EF4444'} 
                                strokeWidth="3" 
                                strokeDasharray={`${analysisResult.default_probability}, 100`} 
                                strokeLinecap="round" 
                                style={{ transition: 'stroke-dasharray 1s ease-in-out' }} 
                              />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--navy)', letterSpacing: '-1px' }}>{analysisResult.default_probability}%</div>
                              <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Default Prob.</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '10px', color: 'var(--slate)', fontWeight: 800, marginBottom: '4px' }}>RISK SCORE</div>
                              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--navy)' }}>{analysisResult.risk_score}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '10px', color: 'var(--slate)', fontWeight: 800, marginBottom: '4px' }}>MONTHLY EMI</div>
                              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--navy)' }}>₹{fmt(analysisResult.emi)}</div>
                            </div>
                          </div>

                          <div style={{ padding: '16px', background: analysisResult.default_probability < 31 ? 'rgba(16,185,129,0.1)' : analysisResult.default_probability < 61 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '16px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 900, color: analysisResult.default_probability < 31 ? '#059669' : analysisResult.default_probability < 61 ? '#D97706' : '#DC2626', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              {analysisResult.default_probability < 31 ? 'LOW RISK' : analysisResult.default_probability < 61 ? 'MEDIUM RISK' : 'HIGH RISK'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--navy)', marginTop: '4px', fontWeight: 600 }}>{analysisResult.recommendation}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '40px', borderRadius: '24px', textAlign: 'center', opacity: 0.6, borderStyle: 'dashed' }}>
                          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate)' }}>Awaiting rate assignment to compute dynamic risk and affordability.</div>
                        </div>
                      )}

                      {/* STEP 3: FINAL ACTIONS */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="p-sec-title" style={{ fontSize: '12px', color: 'var(--slate)', border: 'none', padding: 0, marginTop: '10px' }}>Application Actions</div>
                        
                        {(!selectedApp.status || ['Pending', 'Under Review', 'Additional Verification Required'].includes(selectedApp.status)) && !decisionMode ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div 
                              className="action-card" 
                              style={{ background: '#fff', border: '1.5px solid #e2e8f0', padding: '16px', borderRadius: '18px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s' }} 
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#10B981'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                              onClick={() => setDecisionMode('approve')}
                            >
                              <div style={{ width: '40px', height: '40px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>✓</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>Send Approval Email</div>
                                <div style={{ fontSize: '10px', color: 'var(--slate)' }}>Institutional sanction letter</div>
                              </div>
                            </div>

                            <div 
                              className="action-card" 
                              style={{ background: '#fff', border: '1.5px solid #e2e8f0', padding: '16px', borderRadius: '18px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s' }} 
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#EF4444'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                              onClick={() => setDecisionMode('reject')}
                            >
                              <div style={{ width: '40px', height: '40px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>✕</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>Send Rejection Email</div>
                                <div style={{ fontSize: '10px', color: 'var(--slate)' }}>Adverse action notice</div>
                              </div>
                            </div>

                             <div 
                               className="action-card" 
                               style={{ background: '#fff', border: '1.5px solid #e2e8f0', padding: '16px', borderRadius: '18px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s' }} 
                               onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--sky)'}
                               onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                               onClick={() => setDecisionMode('verify')}
                             >
                               <div style={{ width: '40px', height: '40px', background: 'rgba(75,168,224,0.1)', color: 'var(--sky)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>📁</div>
                               <div style={{ flex: 1 }}>
                                 <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy)' }}>Request Manual Review</div>
                                 <div style={{ fontSize: '10px', color: 'var(--slate)' }}>Escalate for senior approval</div>
                               </div>
                             </div>
                          </div>
                        ) : decisionMode === 'approve' ? (
                          <div className="decision-flow animate-fade" style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '14px' }}>Confirm Sanction</div>
                              <button style={{ color: 'var(--rose)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }} onClick={() => setDecisionMode(null)}>Cancel</button>
                            </div>
                            <textarea 
                              className="f-area" 
                              placeholder="Internal sanction notes (optional)..." 
                              style={{ width: '100%', height: '100px', marginBottom: '20px', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '12px', fontSize: '13px' }} 
                              value={reviewNote} 
                              onChange={e => setReviewNote(e.target.value)} 
                            />
                            <button className="confirm-btn" style={{ width: '100%', padding: '16px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800 }} onClick={() => handleReviewSubmit('Approved')}>Dispatch Approval</button>
                          </div>
                        ) : decisionMode === 'reject' ? (
                          <div className="decision-flow animate-fade" style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '14px' }}>Confirm Rejection</div>
                              <button style={{ color: 'var(--slate)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }} onClick={() => setDecisionMode(null)}>Cancel</button>
                            </div>
                            <textarea 
                              className="f-area" 
                              placeholder="State reason for rejection..." 
                              style={{ width: '100%', height: '100px', marginBottom: '20px', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '12px', fontSize: '13px' }} 
                              value={reviewNote} 
                              onChange={e => setReviewNote(e.target.value)} 
                            />
                            <button className="confirm-btn" style={{ width: '100%', padding: '16px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800 }} onClick={() => handleReviewSubmit('Rejected')}>Dispatch Rejection</button>
                          </div>
                        ) : decisionMode === 'verify' ? (
                          <div className="decision-flow animate-fade" style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '14px' }}>Request Manual Review</div>
                              <button style={{ color: 'var(--slate)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }} onClick={() => setDecisionMode(null)}>Cancel</button>
                            </div>
                            <textarea 
                              className="f-area" 
                              placeholder="Notes for senior underwriter/manual reviewer..." 
                              style={{ width: '100%', height: '100px', marginBottom: '20px', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '12px', fontSize: '13px' }} 
                              value={reviewNote} 
                              onChange={e => setReviewNote(e.target.value)} 
                            />
                            <button className="confirm-btn" style={{ width: '100%', padding: '16px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800 }} onClick={() => handleReviewSubmit('Additional Verification Required')}>Escalate Application</button>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', background: 'rgba(100,116,139,0.05)', padding: '24px', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--navy)', textTransform: 'uppercase' }}>
                              {selectedApp.status.toUpperCase()}
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--slate)', fontWeight: 600 }}>Decided by authorized officer.</div>
                          </div>
                        )}

                        <button style={{ width: '100%', padding: '18px', background: 'none', color: 'var(--slate)', border: '1px solid var(--border)', borderRadius: '14px', fontSize: '14px', fontWeight: 800, marginTop: '10px', cursor: 'pointer' }} onClick={() => setSelectedApp(null)}>Exit Review Workspace</button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}

