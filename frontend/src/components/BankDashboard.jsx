import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ArthaAI from './ArthaAI';
import { calcRisk, buildSched, fmt, fmtK } from '../model';
import Chart from 'chart.js/auto';

export default function BankDashboard({ user, onLogout, theme, toggleTheme }) {
  const [page, setPage] = useState('pg-overview');
  const [isAiOpen, setIsAiOpen] = useState(false);

  const [formData, setFormData] = useState({
    age: 35, credit: 650, income: 820000, loanAmt: 500000, dti: 0.35, lines: 3,
    purpose: 'other', term: 24, rate: 12.99, empType: 'full', empl: 24, jobChanges: 1,
    edu: 'bach', marital: 'married', state: 'MH', customPurpose: '', customTerm: ''
  });
  const [flags, setFlags] = useState({ mort: 'N', dep: 'N', co: 'N' });
  const [result, setResult] = useState(null);

  const [opt, setOpt] = useState({ loanAmt: 130000, credit: 575, dti: 0.35, empType: 'full' });
  const optProb = calcRisk({ ...formData, loanAmt: opt.loanAmt, credit: opt.credit, dti: opt.dti, empType: opt.empType }, flags);

  const update = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));
  const tog = (k, v) => setFlags(prev => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!formData.loanAmt) { alert('Please enter a Loan Amount'); return; }
    const prob = calcRisk(formData, flags);
    const pct = Math.round(prob * 100);
    const level = prob < 0.3 ? 'low' : prob < 0.6 ? 'med' : 'high';
    
    const sched = buildSched(formData.loanAmt, formData.rate, formData.term);
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

    if (page === 'pg-overview') {
      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      const lineC = theme === 'dark' ? '#ECF0F8' : '#0C1428';
      const bgC = theme === 'dark' ? '#0C1428' : '#fff';
      
      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';
      Chart.defaults.font.family = "'Outfit',sans-serif";
      
      const ctxTrend = document.getElementById('cht-trend');
      if (ctxTrend) {
        trendChart = new Chart(ctxTrend, {
          type:'line',
          data:{
            labels:['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'],
            datasets:[
              {label:'Assessments',data:[98,112,125,108,134,141,119,128,145,158],borderColor:lineC,borderWidth:2.5,backgroundColor:lineC,pointBackgroundColor:bgC,pointBorderColor:lineC,pointBorderWidth:2,pointRadius:4,tension:0.4,yAxisID:'y'},
              {label:'Default Rate %',data:[12.1,11.8,11.5,11.9,11.4,11.2,11.7,11.6,11.3,11.6],borderColor:lineC,borderWidth:2.5,backgroundColor:lineC,pointBackgroundColor:bgC,pointBorderColor:lineC,pointBorderWidth:2,pointRadius:4,tension:0.4,yAxisID:'y1'}
            ]
          },
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{usePointStyle:true,boxWidth:8}}},scales:{x:{grid:{color:g}},y:{grid:{color:g},title:{display:true,text:'Assessments'}},y1:{position:'right',grid:{drawOnChartArea:false},title:{display:true,text:'Default %'},ticks:{callback:v=>v+'%'}}}}
        });
      }
      
      const ctxDist = document.getElementById('cht-dist');
      if (ctxDist) {
        distChart = new Chart(ctxDist, {
          type:'doughnut',
          data:{labels:['Low Risk (<30%)','Medium Risk','High Risk (>60%)'],datasets:[{data:[61,27,12],backgroundColor:['#38C9B0','#C9973C','#E85475'],borderColor:theme==='dark'?'#162030':'#fff',borderWidth:3,hoverOffset:8}]},
          options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'top',labels:{usePointStyle:true,boxWidth:8}}}}
        });
      }

      const ctxPurpose = document.getElementById('cht-purpose');
      if (ctxPurpose) {
        purposeChart = new Chart(ctxPurpose, {
          type: 'bar',
          data: {
            labels: ['Home', 'Other', 'Education', 'Auto', 'Business'],
            datasets: [{ data: [10.2, 11.8, 11.9, 11.9, 12.3], backgroundColor: ['#38C9B0', '#A072F0', '#4BA8E0', '#C9973C', '#E85475'], borderRadius: 4 }]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{grid:{color:g},ticks:{callback:v=>v+'%'}}} }
        });
      }

      const ctxCredit = document.getElementById('cht-credit');
      if (ctxCredit) {
        creditChart = new Chart(ctxCredit, {
          type: 'line',
          data: {
            labels: ['300-400', '400-500', '500-600', '600-700', '700-800', '800+'],
            datasets: [{ data: [13.3, 12.1, 11.8, 11.2, 10.4, 9.8], borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.2 }]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{grid:{color:g},ticks:{callback:v=>v+'%'}}} }
        });
      }

      const ctxEmp = document.getElementById('cht-emp');
      if (ctxEmp) {
        empChart = new Chart(ctxEmp, {
          type: 'bar',
          data: {
            labels: ['Full-time', 'Self-empl', 'Part-time', 'Unemployed'],
            datasets: [{ data: [9.5, 11.2, 11.8, 13.6], backgroundColor: ['#38C9B0', '#4BA8E0', '#C9973C', '#E85475'], borderRadius: 4 }]
          },
          options: { indexAxis: 'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:g},ticks:{callback:v=>v+'%'}},y:{grid:{display:false}}} }
        });
      }

      const ctxDti = document.getElementById('cht-dti');
      if (ctxDti) {
        dtiChart = new Chart(ctxDti, {
          type: 'line',
          data: {
            labels: ['0–0.2', '0.2–0.4', '0.4–0.6', '0.6–0.8', '0.8–1.0'],
            datasets: [{ data: [10.4, 11.2, 11.8, 12.1, 12.1], borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.2 }]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{grid:{color:g},ticks:{callback:v=>v+'%'}}} }
        });
      }

      const ctxCoef = document.getElementById('cht-coef');
      if (ctxCoef) {
        coefChart = new Chart(ctxCoef, {
          type: 'bar',
          data: {
            labels: ['Age', 'CoSigner', 'CreditScore', 'InterestRate'],
            datasets: [{ data: [-0.60, -0.14, -0.12, 0.46], backgroundColor: [-0.60, -0.14, -0.12, 0.46].map(v => v < 0 ? '#38C9B0' : '#E85475'), borderRadius: 4 }]
          },
          options: { indexAxis: 'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:g}},y:{grid:{display:false}}} }
        });
      }
    } else if (page === 'pg-history') {
      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';
      Chart.defaults.font.family = "'Outfit',sans-serif";

      const ctxEmi = document.getElementById('cht-emi-reg');
      if (ctxEmi) {
        emiChart = new Chart(ctxEmi, {
          type: 'bar',
          data: {
            labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
            datasets: [{
              data: [18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000],
              backgroundColor: ['#38C9B0', '#38C9B0', '#38C9B0', '#38C9B0', '#38C9B0', '#C9973C', '#38C9B0', '#38C9B0', '#38C9B0', '#38C9B0', '#C9973C', '#38C9B0'],
              borderRadius: 4
            }]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{grid:{color:g},beginAtZero:true,ticks:{callback:v=>v.toLocaleString()}}} }
        });
      }
    } else if (page === 'pg-insights') {
      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      const lineC = theme === 'dark' ? '#ECF0F8' : '#0C1428';
      const bgC = theme === 'dark' ? '#0C1428' : '#fff';
      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';
      Chart.defaults.font.family = "'Outfit',sans-serif";

      const ctxStacked = document.getElementById('cht-stacked-risk');
      if (ctxStacked) {
        stackedChart = new Chart(ctxStacked, {
          type: 'bar',
          data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
            datasets: [
              { label: 'Low', data: [60, 62, 63, 61, 62, 61, 61], backgroundColor: '#38C9B0' },
              { label: 'Medium', data: [28, 26, 26, 27, 26, 27, 27], backgroundColor: '#C9973C' },
              { label: 'High', data: [12, 12, 11, 12, 12, 12, 12], backgroundColor: '#E85475' }
            ]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:g},max:100,ticks:{callback:v=>v+'%'}}} }
        });
      }

      const ctxTrend18 = document.getElementById('cht-trend-18');
      if (ctxTrend18) {
        trend18Chart = new Chart(ctxTrend18, {
          type: 'line',
          data: {
            labels: ['Oct 23', 'Dec', 'Feb', 'Apr', 'Jun', 'Aug', 'Oct', 'Dec', 'Feb'],
            datasets: [{ data: [12.8, 12.1, 11.9, 11.8, 11.5, 11.6, 11.2, 11.3, 11.0], borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.2 }]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:g}},y:{grid:{color:g},min:10,ticks:{callback:v=>v+'%'}}} }
        });
      }

      const ctxSector = document.getElementById('cht-sector-doughnut');
      if (ctxSector) {
        sectorChart = new Chart(ctxSector, {
          type: 'doughnut',
          data: { labels: ['Home','Education','Auto','Other','Business'], datasets: [{ data: [35, 15, 20, 10, 20], backgroundColor: ['#E85475', '#4BA8E0', '#38C9B0', '#A072F0', '#C9973C'], borderWidth: 0 }] },
          options: { responsive:true, maintainAspectRatio:false, cutout:'60%', plugins:{legend:{display:false}} }
        });
      }

      const ctxGeo = document.getElementById('cht-geo-bar');
      if (ctxGeo) {
        geoChart = new Chart(ctxGeo, {
          type: 'bar',
          data: { labels: ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi NCR', 'Gujarat', 'Others'], datasets: [{ data: [312, 278, 241, 198, 187, 283], backgroundColor: '#4BA8E0', borderRadius: 4 }] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{grid:{color:g}}} }
        });
      }

      const ctxStress = document.getElementById('cht-stress-bar');
      if (ctxStress) {
        stressChart = new Chart(ctxStress, {
          type: 'bar',
          data: { labels: ['<20%', '20-30%', '30-40%', '40-50%', '>50%'], datasets: [{ data: [18, 32, 28, 14, 8], backgroundColor: ['#38C9B0', '#38C9B0', '#C9973C', '#E85475', '#E85475'], borderRadius: 4 }] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{grid:{color:g},ticks:{callback:v=>v+'%'}}} }
        });
      }

      const ctxRoc = document.getElementById('cht-roc-curve');
      if (ctxRoc) {
        rocChart = new Chart(ctxRoc, {
          type: 'line',
          data: {
            labels: ['0', '0.2', '0.4', '0.6', '0.8', '1.0'],
            datasets: [
              { label: 'LoanGuard LR', data: [0, 0.35, 0.62, 0.81, 0.92, 1.0], borderColor: lineC, borderWidth: 2.5, backgroundColor: lineC, pointBackgroundColor: bgC, pointBorderColor: lineC, pointBorderWidth: 2, pointRadius: 4, tension: 0.4 },
              { label: 'Random', data: [0, 0.2, 0.4, 0.6, 0.8, 1.0], borderColor: '#E85475', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0 }
            ]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:g},title:{display:true,text:'False Positive Rate'}},y:{grid:{color:g},title:{display:true,text:'True Positive Rate'}}} }
        });
      }
    } else if (page === 'pg-assess' && result) {
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
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{stacked:true,grid:{display:false}}, y:{stacked:true,grid:{color:g},ticks:{callback:v=>v>=1000?fmtK(v):v}}, y1:{position:'right',grid:{display:false},ticks:{callback:v=>v>=1000?fmtK(v):v}} } }
        });
      }
    } else if (page === 'pg-behaviour') {
      const g = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      Chart.defaults.color = theme === 'dark' ? '#A4B0C8' : '#5E6E88';
      Chart.defaults.font.family = "'Outfit',sans-serif";

      const ctxRadar = document.getElementById('cht-radar-behavior');
      if (ctxRadar) {
        trendChart = new Chart(ctxRadar, { // radarChart
          type: 'radar',
          data: {
            labels: ['Electricity', 'Internet', 'Phone', 'Water', 'Rent', 'Insurance', 'Credit Card'],
            datasets: [{
              label: 'Payment Score',
              data: [100, 95, 98, 100, 92, 85, 90],
              backgroundColor: 'rgba(56,201,176,0.15)',
              borderColor: '#38C9B0',
              pointBackgroundColor: theme==='dark'?'#0C1428':'#fff',
              pointBorderColor: '#38C9B0',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: '#38C9B0'
            }]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{r:{angleLines:{color:g},grid:{color:g},pointLabels:{color:theme==='dark'?'#A4B0C8':'#5E6E88',font:{family:"'Outfit',sans-serif"}},ticks:{display:false,min:0,max:100}}} }
        });
      }

      const ctxSpend = document.getElementById('cht-spend-behavior');
      if (ctxSpend) {
        distChart = new Chart(ctxSpend, { // spendChart
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
              { label: 'Spending', data: [52000, 48000, 61000, 44000, 56000, 58000, 49000, 53000, 47000, 62000, 51000, 45000], borderColor: theme==='dark'?'#ECF0F8':'#0C1428', borderWidth: 2.5, pointBackgroundColor: '#38C9B0', pointBorderColor: theme==='dark'?'#ECF0F8':'#0C1428', pointBorderWidth: 2, pointRadius: 4, tension: 0.4 },
              { label: 'Monthly Income', data: Array(12).fill(68333), borderColor: theme==='dark'?'#A4B0C8':'#5E6E88', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0 }
            ]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:g}},y:{grid:{color:g},beginAtZero:false,min:40000,ticks:{callback:v=>v.toLocaleString()}}} }
        });
      }
    } else if (page === 'pg-invest') {
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
          options: { responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{legend:{display:false}} }
        });
      }

      const ctxValue = document.getElementById('cht-value-invest');
      if (ctxValue) {
        creditChart = new Chart(ctxValue, { // valueChart
          type: 'line',
          data: {
            labels: ['Jan 24', 'Mar 24', 'May 24', 'Jul 24', 'Sep 24', 'Nov 24', 'Jan 25', 'Mar 25', 'Apr 25'],
            datasets: [{ label: 'Portfolio Value', data: [420000, 435000, 448000, 462000, 479000, 488000, 501000, 510000, 516200], borderColor: theme==='dark'?'#ECF0F8':'#0C1428', borderWidth: 2.5, pointBackgroundColor: '#38C9B0', pointBorderColor: theme==='dark'?'#ECF0F8':'#0C1428', pointBorderWidth: 2, pointRadius: 4, tension: 0.1 }]
          },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:g}},y:{grid:{color:g},ticks:{callback:v=>'₹'+(v/1000)+'K'}}} }
        });
      }
    }

    return () => {
      if (trendChart) trendChart.destroy();
      if (distChart) distChart.destroy();
      if (purposeChart) purposeChart.destroy();
      if (creditChart) creditChart.destroy();
      if (empChart) empChart.destroy();
      if (dtiChart) dtiChart.destroy();
      if (coefChart) coefChart.destroy();
      if (emiChart) emiChart.destroy();
      if (stackedChart) stackedChart.destroy();
      if (trend18Chart) trend18Chart.destroy();
      if (sectorChart) sectorChart.destroy();
      if (geoChart) geoChart.destroy();
      if (stressChart) stressChart.destroy();
      if (rocChart) rocChart.destroy();
    };
  }, [page, theme, result]);

  return (
    <div className="app-shell active">
      <Sidebar user={user} activePage={page} setPage={setPage} onLogout={onLogout} type="bank" toggleTheme={toggleTheme} theme={theme} />
      
      <div className="main-area">
        <div className="topbar">
          <div className="tb-title">
            {page === 'pg-overview' ? 'Overview Dashboard' : 
             page === 'pg-assess' ? 'Risk Assessment' : 
             page === 'pg-history' ? 'Loan History' :
             page === 'pg-insights' ? 'Business Insights' :
             page === 'pg-behaviour' ? 'Behaviour Profile' :
             page === 'pg-invest' ? 'Investment Portfolio' : 'Recommendations'}
          </div>
          <div className="tb-chip">LR Model · ROC-AUC 0.760 · 255,347 Records</div>
        </div>

        <div className="page-content" style={{ padding: '26px', flex: 1, overflowY: 'auto' }}>
          {page === 'pg-overview' && (
            <div className="fade-in">
              <div className="mib fade-up" style={{display:'flex',gap:'1px',background:'var(--border)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden',marginBottom:'20px'}}>
                <div style={{flex:1,padding:'16px 20px',background:'var(--panel)'}}><div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Algorithm</div><div style={{color:'var(--teal)',fontWeight:700,fontSize:'16px'}}>Logistic<br/>Regression</div></div>
                <div style={{flex:1,padding:'16px 20px',background:'var(--panel)'}}><div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Features</div><div style={{color:'var(--teal)',fontWeight:700,fontSize:'16px'}}>29</div></div>
                <div style={{flex:1,padding:'16px 20px',background:'var(--panel)'}}><div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Preprocessing</div><div style={{color:'var(--teal)',fontWeight:700,fontSize:'16px'}}>StandardScaler +<br/>OHE</div></div>
                <div style={{flex:1,padding:'16px 20px',background:'var(--panel)'}}><div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>ROC-AUC</div><div style={{color:'var(--teal)',fontWeight:700,fontSize:'16px'}}>0.760</div></div>
                <div style={{flex:1,padding:'16px 20px',background:'var(--panel)'}}><div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Accuracy</div><div style={{color:'var(--teal)',fontWeight:700,fontSize:'16px'}}>88.8%</div></div>
                <div style={{flex:1,padding:'16px 20px',background:'var(--panel)'}}><div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Train/Test Split</div><div style={{color:'var(--teal)',fontWeight:700,fontSize:'16px'}}>80 / 20</div></div>
                <div style={{flex:1,padding:'16px 20px',background:'var(--panel)'}}><div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Dataset Default Rate</div><div style={{color:'var(--teal)',fontWeight:700,fontSize:'16px'}}>11.6%</div></div>
              </div>
              <div className="kpi-row" style={{gridTemplateColumns:'repeat(4,1fr)',gap:'20px',marginBottom:'20px'}}>
                <div className="kpi gold fade-up fade-up-d1" style={{padding:'24px'}}><div className="kpi-lbl">Total Assessed</div><div className="kpi-val" style={{fontSize:'40px',marginBottom:'8px'}}>1,247</div><div className="kpi-sub"><span className="up" style={{color:'var(--teal)',fontWeight:600}}>↑ 8.3%</span> vs last month</div></div>
                <div className="kpi teal fade-up fade-up-d2" style={{padding:'24px'}}><div className="kpi-lbl">Approved</div><div className="kpi-val" style={{fontSize:'40px',marginBottom:'8px'}}>1,102</div><div className="kpi-sub">Approval rate <span className="up" style={{color:'var(--teal)',fontWeight:600}}>88.4%</span></div></div>
                <div className="kpi rose fade-up fade-up-d3" style={{padding:'24px'}}><div className="kpi-lbl">Defaults Predicted</div><div className="kpi-val" style={{fontSize:'40px',marginBottom:'8px'}}>145</div><div className="kpi-sub">11.6% model baseline</div></div>
                <div className="kpi sky fade-up fade-up-d4" style={{padding:'24px'}}><div className="kpi-lbl">Model ROC-AUC</div><div className="kpi-val" style={{fontSize:'40px',marginBottom:'8px'}}>0.760</div><div className="kpi-sub">Logistic Regression</div></div>
              </div>
              
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'20px',marginBottom:'20px'}}>
                <div className="card fade-up fade-up-d1">
                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Monthly Volume & Default Rate</div></div>
                  <div style={{height:'300px',position:'relative'}}><canvas id="cht-trend"></canvas></div>
                </div>
                <div className="card fade-up fade-up-d2">
                  <div className="ch"><div className="ct"><div className="pip pip-gold"></div>Risk Distribution</div></div>
                  <div style={{height:'220px',position:'relative'}}><canvas id="cht-dist"></canvas></div>
                  <div style={{marginTop:'20px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'var(--text2)',marginBottom:'8px'}}><span><span style={{color:'#38C9B0',marginRight:'6px'}}>●</span> Low (&lt;30%)</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'var(--text2)',marginBottom:'8px'}}><span><span style={{color:'#C9973C',marginRight:'6px'}}>●</span> Medium (30–60%)</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'var(--text2)'}}><span><span style={{color:'#E85475',marginRight:'6px'}}>●</span> High (&gt;60%)</span></div>
                  </div>
                  <div style={{fontSize:'12px', fontWeight:600, color:'var(--text)', marginTop:'16px'}}>Thresholds from notebook cell 47: [0, 0.3, 0.6, 1]</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'20px'}}>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-teal"></div>Default Rate by Loan Purpose</div></div>
                  <div style={{height:'260px',position:'relative'}}><canvas id="cht-purpose"></canvas></div>
                  <div style={{fontSize:'13px',color:'var(--text)',marginTop:'12px'}}>Home: 10.2% · Business: 12.3% · Auto: 11.9%</div>
                </div>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Credit Score vs Default Rate</div></div>
                  <div style={{height:'260px',position:'relative'}}><canvas id="cht-credit"></canvas></div>
                  <div style={{fontSize:'13px',color:'var(--text)',marginTop:'12px'}}>Actual rates from 255K records</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1.2fr',gap:'20px',marginBottom:'20px'}}>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-gold"></div>By Employment Type</div></div>
                  <div style={{height:'200px',position:'relative'}}><canvas id="cht-emp"></canvas></div>
                  <div style={{fontSize:'13px',color:'var(--text)',marginTop:'12px'}}>Unemployed 13.6% - Full-time 9.5%</div>
                </div>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-gold"></div>By DTI Bucket</div></div>
                  <div style={{height:'200px',position:'relative',background:'var(--gold-glow)',borderRadius:'8px',padding:'10px'}}><canvas id="cht-dti"></canvas></div>
                  <div style={{fontSize:'13px',color:'var(--text)',marginTop:'12px'}}>Higher DTI → higher default</div>
                </div>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-rose"></div>Top Feature Coefficients</div></div>
                  <div style={{height:'200px',position:'relative'}}><canvas id="cht-coef"></canvas></div>
                  <div style={{fontSize:'13px',color:'var(--text)',marginTop:'12px'}}>From actual LogReg model coefficients</div>
                </div>
              </div>
            </div>
          )}

          {page === 'pg-assess' && (
             <div className="fade-in">
               <div className="card glass mb18">
                 <div className="ch">
                   <div className="ct"><div className="pip pip-sky" />Applicant Details</div>
                   <div className="mbadge" style={{background:'rgba(201,151,60,0.1)',color:'var(--gold)',border:'1px solid rgba(201,151,60,0.2)',fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>Real LR Model</div>
                 </div>
                 
                 <div className="form-grid">
                   <div className="fg-sec"><div className="fg-sec-dot" />PERSONAL</div>
                   <div>
                     <div className="flab">AGE (18-69)</div>
                     <input type="number" className="finput" value={formData.age} onChange={e => update('age', +e.target.value)} />
                   </div>
                   <div>
                     <div className="flab">CREDIT SCORE (300-850)</div>
                     <input type="number" className="finput" value={formData.credit} onChange={e => update('credit', +e.target.value)} />
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
                       <option value="MH">Maharashtra</option><option value="DL">Delhi</option><option value="KA">Karnataka</option><option value="TN">Tamil Nadu</option><option value="GJ">Gujarat</option>
                     </select>
                   </div>
                   <div>
                     <div className="flab">ANNUAL INCOME (₹)</div>
                     <input type="number" className="finput" value={formData.income} onChange={e => update('income', +e.target.value)} />
                   </div>
                   <div>
                     <div className="flab">LOAN AMOUNT (₹)</div>
                     <input type="number" className="finput" value={formData.loanAmt} onChange={e => update('loanAmt', +e.target.value)} />
                   </div>
                   <div>
                     <div className="flab">DTI RATIO (0-1)</div>
                     <input type="number" step="0.01" className="finput" value={formData.dti} onChange={e => update('dti', +e.target.value)} />
                   </div>
                   <div>
                     <div className="flab">CREDIT LINES</div>
                     <input type="number" className="finput" value={formData.lines} onChange={e => update('lines', +e.target.value)} />
                   </div>

                   <div className="fg-sec"><div className="fg-sec-dot" />LOAN DETAILS</div>
                   <div>
                     <div className="flab">LOAN PURPOSE <span className="combo-tag">+ CUSTOM</span></div>
                     <div className="combo-field">
                       <select className="combo-select" value={formData.purpose} onChange={e => update('purpose', e.target.value)}>
                         <option value="home">🏠 Home</option><option value="auto">🚗 Auto</option><option value="education">🎓 Education</option><option value="business">🏢 Business</option><option value="other">📦 Other</option><option value="custom">✏️ Custom</option>
                       </select>
                       <input className={`combo-manual ${formData.purpose === 'custom' ? 'show' : ''}`} value={formData.customPurpose} onChange={e => update('customPurpose', e.target.value)} />
                     </div>
                   </div>
                   <div>
                     <div className="flab">LOAN TERM <span className="combo-tag">+ CUSTOM</span></div>
                     <div className="combo-field">
                       <select className="combo-select" value={formData.term} onChange={e => update('term', e.target.value)}>
                         <option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="60">60 months</option><option value="custom">✏️ Custom</option>
                       </select>
                       <input type="number" className={`combo-manual ${formData.term === 'custom' ? 'show' : ''}`} value={formData.customTerm} onChange={e => update('customTerm', e.target.value)} />
                     </div>
                   </div>
                   <div>
                     <div className="flab">INTEREST RATE % (2-25)</div>
                     <input type="number" step="0.01" className="finput" value={formData.rate} onChange={e => update('rate', +e.target.value)} />
                   </div>

                   <div className="fg-sec"><div className="fg-sec-dot" />EMPLOYMENT</div>
                   <div>
                     <div className="flab">EMPLOYMENT TYPE</div>
                     <select className="fselect" value={formData.empType} onChange={e => update('empType', e.target.value)}>
                       <option value="full">Full-time</option><option value="part">Part-time</option><option value="self">Self-employed</option><option value="unemployed">Unemployed</option>
                     </select>
                   </div>
                   <div>
                     <div className="flab">MONTHS EMPLOYED (0-119)</div>
                     <input type="number" className="finput" value={formData.empl} onChange={e => update('empl', +e.target.value)} />
                   </div>
                   <div>
                     <div className="flab">JOB CHANGES (LAST 5 YRS)</div>
                     <input type="number" className="finput" value={formData.jobChanges} onChange={e => update('jobChanges', +e.target.value)} />
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

                   <div className="fg-full" style={{ marginTop: '10px' }}>
                     <button className="btn-main" onClick={handleSubmit}>⚡ Assess Default Risk</button>
                   </div>
                 </div>
               </div>

               {result && (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.1fr', gap: '20px' }}>
                   <div className="card fade-in">
                        <div className="ch">
                          <div className="ct"><div className="pip pip-sky" />Risk Assessment</div>
                          <div className="mbadge" style={{background:'rgba(201,151,60,0.1)',color:'var(--gold)',border:'1px solid rgba(201,151,60,0.2)',fontFamily:"'JetBrains Mono',monospace"}}>σ(wᵀx+b)</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                          <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: `conic-gradient(${result.level==='low'?'var(--teal)':result.level==='med'?'var(--gold)':'var(--rose)'} ${result.pct}%, var(--bg2) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <div style={{ width: '136px', height: '136px', borderRadius: '50%', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces',serif", fontSize: '48px', fontWeight: 700, color: result.level==='low'?'var(--teal)':result.level==='med'?'var(--gold)':'var(--rose)' }}>
                              {result.pct}%
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px' }}>DEFAULT PROBABILITY · σ(WᵀX+B)</div>
                          <div style={{ width: '100%', height: '4px', background: 'var(--bg2)', borderRadius: '2px', marginTop: '20px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${result.pct}%`, background: result.level==='low'?'var(--teal)':result.level==='med'?'var(--gold)':'var(--rose)' }}></div>
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: result.level==='low'?'rgba(56,201,176,0.06)':result.level==='med'?'rgba(201,151,60,0.06)':'rgba(232,84,117,0.06)', border: `1px solid ${result.level==='low'?'rgba(56,201,176,0.2)':result.level==='med'?'rgba(201,151,60,0.2)':'rgba(232,84,117,0.2)'}`, borderRadius: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: result.level==='low'?'var(--teal)':result.level==='med'?'var(--gold)':'var(--rose)', marginBottom: '8px', fontSize: '14px' }}>
                            {result.level==='low'?'🟢 Low Risk — Likely Approved':result.level==='med'?'🟡 Medium Risk — Manual Review':'🔴 High Risk — Likely Rejected'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>
                            {result.level==='low'?'Strong repayment profile. Default probability below 30%. Loan recommended for approval.':
                             result.level==='med'?'Borderline profile. Default probability between 30% and 60%. Manual underwriter review required.':
                             'Weak repayment profile. Default probability exceeds 60%. Loan recommended for rejection.'}
                          </div>
                        </div>
                      </div>

                      <div className="card fade-in" style={{ animationDelay: '0.1s' }}>
                        <div className="ch"><div className="ct"><div className="pip pip-gold" />Loan Repayment Breakdown</div></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Fraunces',serif", fontSize: '20px', fontWeight: 700, color: '#4BA8E0', marginBottom: '6px' }}>₹{fmt(result.emi)}</div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly EMI</div>
                          </div>
                          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Fraunces',serif", fontSize: '20px', fontWeight: 700, color: 'var(--teal)', marginBottom: '6px' }}>₹{fmt(formData.loanAmt)}</div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Principal</div>
                          </div>
                          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Fraunces',serif", fontSize: '20px', fontWeight: 700, color: 'var(--rose)', marginBottom: '6px' }}>₹{fmt(result.totalInt)}</div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Interest</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '10px' }}>
                          <div style={{ width: `${result.pPct}%`, background: '#4BA8E0' }}></div>
                          <div style={{ width: `${result.iPct}%`, background: 'var(--rose)' }}></div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text)', fontWeight: 600, marginBottom: '24px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: '#4BA8E0', borderRadius: '2px' }}></span> Principal {result.pPct.toFixed(0)}%</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: 'var(--rose)', borderRadius: '2px' }}></span> Interest {result.iPct.toFixed(0)}%</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Total Repayment</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>₹{fmt(result.totalRepay)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Interest Cost</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--rose)' }}>₹{fmt(result.totalInt)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Rate (p.a.)</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{formData.rate}%</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Term</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{formData.term} months</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>EMI / Monthly Income</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: ((result.emi / (formData.income/12))*100)>50?'var(--gold)':'var(--teal)' }}>{((result.emi / (formData.income/12))*100).toFixed(1)}% {((result.emi / (formData.income/12))*100)>50?'⚠️':''}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span style={{ color: 'var(--text2)' }}>Loan / Annual Income</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--teal)' }}>{(formData.loanAmt / formData.income).toFixed(2)}x</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text2)' }}>Purpose</span><span>📦 {formData.purpose}</span></div>
                        </div>
                      </div>

                      <div className="card fade-in" style={{ animationDelay: '0.2s' }}>
                        <div className="ch"><div className="ct"><div className="pip pip-teal" />Feature Influence (Real Coefficients)</div></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {result.features.map(f => (
                            <div key={f.name} style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
                              <div style={{ width: '130px', color: 'var(--text2)' }}>{f.name}</div>
                              <div style={{ width: '45px', fontSize: '10px', fontWeight: 600, color: f.type==='pos'?'var(--rose)':'var(--teal)' }}>{f.type==='pos'?'+ risk':'- risk'}</div>
                              <div style={{ flex: 1, height: '6px', background: 'var(--bg2)', borderRadius: '3px', position: 'relative' }}>
                                <div style={{ 
                                   position: 'absolute', height: '100%', borderRadius: '3px', 
                                   background: f.type==='pos'?'var(--rose)':'var(--teal)',
                                   width: `${Math.abs(f.val) * 100}%`,
                                   ...(f.type==='pos' ? { left: '50%' } : { right: '50%' })
                                }} />
                              </div>
                              <div style={{ width: '50px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text3)' }}>{f.val > 0 ? `+${f.val}` : f.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                  </div>
                )}

               {result && (
                 <div className="card fade-up" style={{ marginTop: '20px', animationDelay: '0.3s' }}>
                   <div className="ch">
                     <div className="ct"><div className="pip pip-sky"></div>Full Amortization Schedule</div>
                     <div className="mbadge" style={{background:'transparent',color:'var(--text2)',border:'none'}}>₹{fmt(result.totalRepay)} · {formData.rate}% · {formData.term}mo</div>
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
                             <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>Mo {m.m}</td>
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
               )}
             </div>
          )}
          
          {page === 'pg-history' && (
            <div className="fade-in">
               <div className="card mb18 fade-up"><div className="ch"><div className="ct"><div className="pip pip-sky"></div>Recent Loan Assessments</div></div>
                 <table className="tbl" style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
                   <thead>
                     <tr style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid var(--border)'}}>
                       <th style={{padding:'12px 14px'}}>LoanID</th><th style={{padding:'12px 14px'}}>Purpose</th><th style={{padding:'12px 14px'}}>State</th><th style={{padding:'12px 14px'}}>Loan Amt</th><th style={{padding:'12px 14px'}}>Income</th><th style={{padding:'12px 14px'}}>Credit</th><th style={{padding:'12px 14px'}}>DTI</th><th style={{padding:'12px 14px'}}>Default Prob.</th><th style={{padding:'12px 14px'}}>Risk</th><th style={{padding:'12px 14px'}}>Decision</th>
                     </tr>
                   </thead>
                   <tbody style={{fontSize:'13px',color:'var(--text)'}}>
                     <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'var(--text2)'}}>I38PQUQS96</td>
                      <td style={{padding:'16px 14px'}}>Other</td>
                      <td style={{padding:'16px 14px'}}>🟠 Maharashtra</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹50,587</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹85,994</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>520</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>0.44</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--teal)'}}>16%</td>
                      <td style={{padding:'16px 14px'}}><span className="bpill bp-teal" style={{padding:'4px 10px'}}>Low</span></td>
                      <td style={{padding:'16px 14px',fontWeight:700,fontSize:'12px',color:'var(--teal)'}}>Approved</td>
                     </tr>
                     <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'var(--text2)'}}>HPSK72WA7R</td>
                      <td style={{padding:'16px 14px'}}>Other</td>
                      <td style={{padding:'16px 14px'}}>🔵 Karnataka</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹1,24,440</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹50,432</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>458</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>0.68</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--gold)'}}>42%</td>
                      <td style={{padding:'16px 14px'}}><span className="bpill bp-gold" style={{padding:'4px 10px'}}>Med</span></td>
                      <td style={{padding:'16px 14px',fontWeight:700,fontSize:'12px',color:'var(--gold)'}}>Under Review</td>
                     </tr>
                     <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'var(--text2)'}}>C10Z6DPJ8Y</td>
                      <td style={{padding:'16px 14px'}}>Auto</td>
                      <td style={{padding:'16px 14px'}}>🟢 Tamil Nadu</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹1,29,188</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹84,208</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>451</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>0.31</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--rose)'}}>64%</td>
                      <td style={{padding:'16px 14px'}}><span className="bpill bp-rose" style={{padding:'4px 10px'}}>High</span></td>
                      <td style={{padding:'16px 14px',fontWeight:700,fontSize:'12px',color:'var(--rose)'}}>Rejected</td>
                     </tr>
                     <tr style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'var(--text2)'}}>MRWQ87TY21</td>
                      <td style={{padding:'16px 14px'}}>Home</td>
                      <td style={{padding:'16px 14px'}}>🟡 Delhi NCR</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹78,000</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹1,10,000</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>710</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>0.28</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--teal)'}}>9%</td>
                      <td style={{padding:'16px 14px'}}><span className="bpill bp-teal" style={{padding:'4px 10px'}}>Low</span></td>
                      <td style={{padding:'16px 14px',fontWeight:700,fontSize:'12px',color:'var(--teal)'}}>Approved</td>
                     </tr>
                     <tr>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'var(--text2)'}}>PLKR45GH9W</td>
                      <td style={{padding:'16px 14px'}}>Business</td>
                      <td style={{padding:'16px 14px'}}>🟣 Gujarat</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹2,20,000</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>₹95,000</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>530</td><td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace"}}>0.55</td>
                      <td style={{padding:'16px 14px',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--gold)'}}>41%</td>
                      <td style={{padding:'16px 14px'}}><span className="bpill bp-gold" style={{padding:'4px 10px'}}>Med</span></td>
                      <td style={{padding:'16px 14px',fontWeight:700,fontSize:'12px',color:'var(--gold)'}}>Under Review</td>
                     </tr>
                   </tbody>
                 </table>
               </div>
               
               <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
                 <div className="card fade-up">
                   <div className="ch"><div className="ct"><div className="pip pip-teal"></div>Bill Payment History (36 months)</div></div>
                   <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:'4px',marginBottom:'14px'}}>
                     {Array.from({length:36}).map((_,i) => {
                       const isLate = i === 5 || i === 18 || i === 31;
                       const isMissed = i === 10;
                       return <div key={i} style={{aspectRatio:'1',borderRadius:'3px',background:isMissed?'#E85475':isLate?'#C9973C':'#38C9B0',opacity:0.8}}></div>
                     })}
                   </div>
                   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'11px',color:'var(--text3)'}}>
                     <div style={{display:'flex',gap:'12px'}}>
                       <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#38C9B0'}}></span> On-time</span>
                       <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#C9973C'}}></span> Late</span>
                       <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#E85475'}}></span> Missed</span>
                     </div>
                     <div style={{fontFamily:"'JetBrains Mono',monospace"}}>Payment Score: 93/100</div>
                   </div>
                 </div>
                 
                 <div className="card fade-up">
                   <div className="ch"><div className="ct"><div className="pip pip-gold"></div>EMI Payment Regularity (12 mo)</div></div>
                   <div style={{display:'flex',justifyContent:'center',gap:'16px',fontSize:'11px',color:'var(--text3)',marginBottom:'10px'}}>
                     <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',background:'#38C9B0'}}></span> On-time</span>
                     <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',background:'#C9973C'}}></span> Late/Partial</span>
                   </div>
                   <div style={{height:'180px',position:'relative'}}><canvas id="cht-emi-reg"></canvas></div>
                 </div>
               </div>
            </div>
          )}
          
          {page === 'pg-insights' && (
            <div className="fade-in">
              <div className="card mb18 fade-up" style={{padding:'30px'}}>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:'24px',fontWeight:700,color:'var(--text)',marginBottom:'8px'}}>Business Insights</div>
                <div style={{fontSize:'13px',color:'var(--text2)',marginBottom:'24px'}}>Portfolio-level analytics, sector exposure, geographic distribution, and model performance tracking — all derived from the 255,347 loan dataset.</div>
                <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                  <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px 20px',background:'var(--bg2)',minWidth:'140px'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:'20px',fontWeight:700,color:'var(--gold)',marginBottom:'4px'}}>₹32.6Cr</div>
                    <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px'}}>Total Portfolio</div>
                  </div>
                  <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px 20px',background:'var(--bg2)',minWidth:'140px'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:'20px',fontWeight:700,color:'var(--gold)',marginBottom:'4px'}}>11.6%</div>
                    <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px'}}>Overall Default Rate</div>
                  </div>
                  <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px 20px',background:'var(--bg2)',minWidth:'140px'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:'20px',fontWeight:700,color:'var(--gold)',marginBottom:'4px'}}>0.760</div>
                    <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px'}}>Model ROC-AUC</div>
                  </div>
                  <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px 20px',background:'var(--bg2)',minWidth:'140px'}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:'20px',fontWeight:700,color:'var(--gold)',marginBottom:'4px'}}>₹1.27L</div>
                    <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px'}}>Avg Loan Size</div>
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'20px',marginBottom:'20px'}}>
                <div className="card fade-up">
                  <div style={{fontSize:'20px',marginBottom:'12px'}}>💰</div>
                  <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Net Interest Income</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:'28px',fontWeight:700,color:'var(--teal)',marginBottom:'8px'}}>₹8.4Cr</div>
                  <div style={{fontSize:'12px',color:'var(--teal)',fontWeight:600,marginBottom:'16px'}}>↑ 12.3% QoQ</div>
                  <div style={{height:'4px',background:'var(--bg2)',borderRadius:'2px',overflow:'hidden'}}><div style={{width:'73%',height:'100%',background:'var(--teal)'}}></div></div>
                </div>
                <div className="card fade-up">
                  <div style={{fontSize:'20px',marginBottom:'12px'}}>⚠️</div>
                  <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>NPA Exposure</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:'28px',fontWeight:700,color:'var(--rose)',marginBottom:'8px'}}>₹3.8Cr</div>
                  <div style={{fontSize:'12px',color:'var(--rose)',fontWeight:600,marginBottom:'16px'}}>↑ 2.1% vs last Q</div>
                  <div style={{height:'4px',background:'var(--bg2)',borderRadius:'2px',overflow:'hidden'}}><div style={{width:'27%',height:'100%',background:'var(--rose)'}}></div></div>
                </div>
                <div className="card fade-up">
                  <div style={{fontSize:'20px',marginBottom:'12px'}}>📊</div>
                  <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Recovery Rate</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:'28px',fontWeight:700,color:'var(--gold)',marginBottom:'8px'}}>64.2%</div>
                  <div style={{fontSize:'12px',color:'var(--teal)',fontWeight:600,marginBottom:'16px'}}>↑ 3.8% this quarter</div>
                  <div style={{height:'4px',background:'var(--bg2)',borderRadius:'2px',overflow:'hidden'}}><div style={{width:'64%',height:'100%',background:'var(--gold)'}}></div></div>
                </div>
                <div className="card fade-up">
                  <div style={{fontSize:'20px',marginBottom:'12px'}}>🎯</div>
                  <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Model Precision</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:'28px',fontWeight:700,color:'var(--sky)',marginBottom:'8px'}}>64%</div>
                  <div style={{fontSize:'12px',color:'var(--text2)',fontWeight:600,marginBottom:'16px'}}>On default class</div>
                  <div style={{height:'4px',background:'var(--bg2)',borderRadius:'2px',overflow:'hidden'}}><div style={{width:'64%',height:'100%',background:'var(--sky)'}}></div></div>
                </div>
              </div>
              
              <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:'20px',marginBottom:'20px'}}>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-rose"></div>Risk Category Breakdown</div></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    <div style={{border:'1px solid rgba(56,201,176,0.2)',background:'rgba(56,201,176,0.04)',borderRadius:'8px',padding:'16px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,color:'var(--teal)',marginBottom:'4px'}}>61%</div>
                      <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Low Risk</div>
                      <div style={{fontSize:'11px',color:'var(--teal)',marginTop:'4px'}}>↑ 2.1pp</div>
                    </div>
                    <div style={{border:'1px solid rgba(201,151,60,0.2)',background:'rgba(201,151,60,0.04)',borderRadius:'8px',padding:'16px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,color:'var(--gold)',marginBottom:'4px'}}>27%</div>
                      <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Medium Risk</div>
                      <div style={{fontSize:'11px',color:'var(--rose)',marginTop:'4px'}}>↓ 0.8pp</div>
                    </div>
                    <div style={{border:'1px solid rgba(232,84,117,0.2)',background:'rgba(232,84,117,0.04)',borderRadius:'8px',padding:'16px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,color:'var(--rose)',marginBottom:'4px'}}>12%</div>
                      <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>High Risk</div>
                      <div style={{fontSize:'11px',color:'var(--rose)',marginTop:'4px'}}>↑ 1.3pp</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'20px'}}>
                    <div style={{border:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:'18px',fontWeight:700,color:'var(--teal)',marginBottom:'2px'}}>1,102</div>
                      <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Approved</div>
                    </div>
                    <div style={{border:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:'18px',fontWeight:700,color:'var(--gold)',marginBottom:'2px'}}>337</div>
                      <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Under Review</div>
                    </div>
                    <div style={{border:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:'18px',fontWeight:700,color:'var(--rose)',marginBottom:'2px'}}>145</div>
                      <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Declined</div>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'center',gap:'16px',fontSize:'11px',color:'var(--text3)',marginBottom:'10px'}}>
                    <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{width:'10px',height:'10px',background:'#38C9B0'}}></span> Low</span>
                    <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{width:'10px',height:'10px',background:'#C9973C'}}></span> Medium</span>
                    <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{width:'10px',height:'10px',background:'#E85475'}}></span> High</span>
                  </div>
                  <div style={{height:'180px',position:'relative'}}><canvas id="cht-stacked-risk"></canvas></div>
                </div>

                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Default Rate Trend (18 months)</div></div>
                  <div style={{height:'260px',position:'relative'}}><canvas id="cht-trend-18"></canvas></div>
                  <div style={{marginTop:'20px',background:'rgba(56,201,176,0.08)',border:'1px solid rgba(56,201,176,0.2)',borderRadius:'10px',padding:'16px'}}>
                    <div style={{fontWeight:700,color:'var(--teal)',fontSize:'13px',marginBottom:'6px'}}>📉 Improving Trend</div>
                    <div style={{fontSize:'13px',color:'var(--text)',lineHeight:1.5}}>Default rate declined 0.8pp over 18 months, driven by improved credit score filtering and co-signer policies.</div>
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:'20px',marginBottom:'20px'}}>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-gold"></div>Sector Exposure & Default Rate</div></div>
                  <div style={{display:'flex',flexDirection:'column',gap:'16px',marginBottom:'30px'}}>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <div style={{width:'30px',fontSize:'18px'}}>🏠</div>
                      <div style={{flex:1,fontSize:'13px',fontWeight:600}}>Home Loans</div>
                      <div style={{width:'60px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontSize:'12px'}}>₹8.2Cr</div>
                      <div style={{width:'100px',margin:'0 16px',height:'4px',background:'var(--bg2)',borderRadius:'2px',position:'relative'}}><div style={{position:'absolute',left:0,top:0,bottom:0,width:'25%',background:'var(--teal)',borderRadius:'2px'}}></div></div>
                      <div style={{width:'40px',textAlign:'right',fontWeight:700,fontSize:'12px',color:'var(--teal)'}}>10.2%</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <div style={{width:'30px',fontSize:'18px'}}>🎓</div>
                      <div style={{flex:1,fontSize:'13px',fontWeight:600}}>Education Loans</div>
                      <div style={{width:'60px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontSize:'12px'}}>₹4.1Cr</div>
                      <div style={{width:'100px',margin:'0 16px',height:'4px',background:'var(--bg2)',borderRadius:'2px',position:'relative'}}><div style={{position:'absolute',left:0,top:0,bottom:0,width:'15%',background:'var(--teal)',borderRadius:'2px'}}></div></div>
                      <div style={{width:'40px',textAlign:'right',fontWeight:700,fontSize:'12px',color:'var(--teal)'}}>11.8%</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <div style={{width:'30px',fontSize:'18px'}}>📦</div>
                      <div style={{flex:1,fontSize:'13px',fontWeight:600}}>Other Purposes</div>
                      <div style={{width:'60px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontSize:'12px'}}>₹6.4Cr</div>
                      <div style={{width:'100px',margin:'0 16px',height:'4px',background:'var(--bg2)',borderRadius:'2px',position:'relative'}}><div style={{position:'absolute',left:0,top:0,bottom:0,width:'20%',background:'var(--gold)',borderRadius:'2px'}}></div></div>
                      <div style={{width:'40px',textAlign:'right',fontWeight:700,fontSize:'12px',color:'var(--gold)'}}>11.8%</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <div style={{width:'30px',fontSize:'18px'}}>🏢</div>
                      <div style={{flex:1,fontSize:'13px',fontWeight:600}}>Business Loans</div>
                      <div style={{width:'60px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontSize:'12px'}}>₹8.1Cr</div>
                      <div style={{width:'100px',margin:'0 16px',height:'4px',background:'var(--bg2)',borderRadius:'2px',position:'relative'}}><div style={{position:'absolute',left:0,top:0,bottom:0,width:'28%',background:'var(--rose)',borderRadius:'2px'}}></div></div>
                      <div style={{width:'40px',textAlign:'right',fontWeight:700,fontSize:'12px',color:'var(--rose)'}}>12.3%</div>
                    </div>
                  </div>
                  
                  <div style={{display:'flex',justifyContent:'center',gap:'12px',fontSize:'11px',color:'var(--text3)',marginBottom:'14px'}}>
                    <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',background:'#E85475'}}></span> Home</span>
                    <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',background:'#4BA8E0'}}></span> Education</span>
                    <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',background:'#38C9B0'}}></span> Auto</span>
                    <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',background:'#A072F0'}}></span> Other</span>
                    <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'8px',height:'8px',background:'#C9973C'}}></span> Business</span>
                  </div>
                  <div style={{height:'180px',position:'relative'}}><canvas id="cht-sector-doughnut"></canvas></div>
                </div>

                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Geographic Distribution</div></div>
                  <table style={{width:'100%',textAlign:'left',borderCollapse:'collapse',marginBottom:'24px'}}>
                    <thead>
                      <tr style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid var(--border)'}}>
                        <th style={{padding:'8px',fontWeight:700}}></th><th style={{padding:'8px',textAlign:'right'}}>Volume</th><th style={{padding:'8px',textAlign:'right'}}>Default%</th><th style={{padding:'8px',textAlign:'right'}}>Avg Loan</th>
                      </tr>
                    </thead>
                    <tbody style={{fontSize:'13px',color:'var(--text)'}}>
                      <tr style={{borderBottom:'1px solid var(--border)'}}><td style={{padding:'12px 8px',fontWeight:600}}>Maharashtra</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>312</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>11.2%</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>₹1.20L</td></tr>
                      <tr style={{borderBottom:'1px solid var(--border)'}}><td style={{padding:'12px 8px',fontWeight:600}}>Karnataka</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>278</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>10.8%</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>₹1.18L</td></tr>
                      <tr style={{borderBottom:'1px solid var(--border)'}}><td style={{padding:'12px 8px',fontWeight:600}}>Tamil Nadu</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>241</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>11.9%</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>₹1.15L</td></tr>
                      <tr style={{borderBottom:'1px solid var(--border)'}}><td style={{padding:'12px 8px',fontWeight:600}}>Delhi NCR</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>198</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>12.4%</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>₹1.52L</td></tr>
                      <tr style={{borderBottom:'1px solid var(--border)'}}><td style={{padding:'12px 8px',fontWeight:600}}>Gujarat</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>187</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>10.5%</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>₹1.31L</td></tr>
                      <tr><td style={{padding:'12px 8px',fontWeight:600}}>Others</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>283</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>12.1%</td><td style={{padding:'12px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace"}}>₹1.09L</td></tr>
                    </tbody>
                  </table>
                  <div style={{height:'240px',position:'relative'}}><canvas id="cht-geo-bar"></canvas></div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-rose"></div>EMI-to-Income Stress Distribution</div></div>
                  <div style={{height:'240px',position:'relative'}}><canvas id="cht-stress-bar"></canvas></div>
                </div>
                <div className="card fade-up">
                  <div className="ch"><div className="ct"><div className="pip pip-sky"></div>Model ROC Curve (approximated)</div></div>
                  <div style={{display:'flex',justifyContent:'center',gap:'16px',fontSize:'11px',color:'var(--text3)',marginBottom:'10px'}}>
                    <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{width:'10px',height:'10px',border:'2px solid var(--text)',background:'transparent'}}></span> LoanGuard LR (AUC=0.760)</span>
                    <span style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{width:'10px',height:'10px',border:'2px dashed #E85475',background:'transparent'}}></span> Random (AUC=0.500)</span>
                  </div>
                  <div style={{height:'240px',position:'relative'}}><canvas id="cht-roc-curve"></canvas></div>
                </div>
              </div>
            </div>
          )}
          
          {page === 'pg-behaviour' && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="card fade-up">
                <div className="ch"><div className="ct"><div className="pip pip-sky" />Job Stability Analysis</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: 'rgba(56,201,176,0.06)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: '24px', fontWeight: 700, color: 'var(--teal)', marginBottom: '4px' }}>30mo</div>
                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>Avg Tenure</div>
                  </div>
                  <div style={{ background: 'var(--bg2)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: '24px', fontWeight: 700, color: 'var(--gold)', marginBottom: '4px' }}>0.2</div>
                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>Changes/yr</div>
                  </div>
                  <div style={{ background: 'rgba(75,168,224,0.06)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: '24px', fontWeight: 700, color: '#4BA8E0', marginBottom: '4px' }}>A+</div>
                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>Stability</div>
                  </div>
                </div>
                <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '1px solid var(--border)', marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-25px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--rose)', border: '2px solid var(--panel)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>Infosys Ltd</span>
                      <span style={{ fontSize: '10px', background: 'rgba(232,84,117,0.1)', color: 'var(--rose)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>12mo</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>2019 - 2020</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-25px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--teal)', border: '2px solid var(--panel)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>HCL Technologies</span>
                      <span style={{ fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>20mo</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>2020 - Present</div>
                  </div>
                </div>
              </div>
              
              <div className="card fade-up fade-up-d1">
                <div className="ch"><div className="ct"><div className="pip pip-gold" />Behaviour Signals</div></div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(56,201,176,0.2)' }}>● Stable Employment</span>
                  <span style={{ fontSize: '11px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(56,201,176,0.2)' }}>● Low Job Hopping</span>
                  <span style={{ fontSize: '11px', background: 'rgba(75,168,224,0.1)', color: '#4BA8E0', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(75,168,224,0.2)' }}>● Co-Signer ✓</span>
                  <span style={{ fontSize: '11px', background: 'rgba(75,168,224,0.1)', color: '#4BA8E0', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(75,168,224,0.2)' }}>● UPI Activity</span>
                  <span style={{ fontSize: '11px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(56,201,176,0.2)' }}>● Utility Bills OK</span>
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

          {page === 'pg-invest' && (
            <div className="fade-in">
              <div className="kpi-row" style={{ marginBottom: '20px' }}>
                <div className="kpi sky fade-up">
                  <div className="kpi-lbl">TOTAL INVESTED</div>
                  <div className="kpi-val" style={{ color: '#4BA8E0', fontSize: '32px' }}>₹4.2L</div>
                  <div className="kpi-sub">5 instruments</div>
                </div>
                <div className="kpi teal fade-up fade-up-d1">
                  <div className="kpi-lbl">CURRENT VALUE</div>
                  <div className="kpi-val" style={{ color: 'var(--teal)', fontSize: '32px' }}>₹5.1L</div>
                  <div className="kpi-sub"><span className="up">↑ 21.4%</span> total return</div>
                </div>
                <div className="kpi gold fade-up fade-up-d2">
                  <div className="kpi-lbl">FIXED INCOME</div>
                  <div className="kpi-val" style={{ color: 'var(--gold)', fontSize: '32px' }}>₹2.0L</div>
                  <div className="kpi-sub">FD + PPF + Bonds</div>
                </div>
                <div className="kpi rose fade-up fade-up-d3">
                  <div className="kpi-lbl">EQUITY</div>
                  <div className="kpi-val" style={{ color: 'var(--rose)', fontSize: '32px' }}>₹2.2L</div>
                  <div className="kpi-sub">Stocks + MF</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="card fade-up">
                    <div className="ch"><div className="ct"><div className="pip pip-sky" />Portfolio Holdings</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div><div style={{ fontWeight: 700, fontSize: '13px' }}>SBI Fixed Deposit</div><div style={{ fontSize: '11px', color: 'var(--text2)' }}>Fixed Income</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: '13px' }}>₹93,200</div><div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>+16.5%</div></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div><div style={{ fontWeight: 700, fontSize: '13px' }}>HDFC Equity Fund</div><div style={{ fontSize: '11px', color: 'var(--text2)' }}>Mutual Fund</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: '13px' }}>₹1,56,000</div><div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>+30%</div></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div><div style={{ fontWeight: 700, fontSize: '13px' }}>PPF Account</div><div style={{ fontSize: '11px', color: 'var(--text2)' }}>Govt Scheme</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: '13px' }}>₹58,500</div><div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>+17%</div></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div><div style={{ fontWeight: 700, fontSize: '13px' }}>Reliance Industries</div><div style={{ fontSize: '11px', color: 'var(--text2)' }}>Direct Equity</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: '13px' }}>₹1,34,000</div><div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>+34%</div></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontWeight: 700, fontSize: '13px' }}>NHAI Bonds</div><div style={{ fontSize: '11px', color: 'var(--text2)' }}>Govt Bonds</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: '13px' }}>₹74,500</div><div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>+6.4%</div></div>
                      </div>
                    </div>
                    
                    <div className="ch" style={{ marginTop: '30px' }}><div className="ct"><div className="pip pip-teal" />Value Over Time</div></div>
                    <div style={{ height: '220px', position: 'relative' }}><canvas id="cht-value-invest"></canvas></div>

                    <div className="ch" style={{ marginTop: '30px' }}>
                      <div className="ct">🎯 Where to Invest Next</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 400 }}>Based on your portfolio & risk profile</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ border: '1px solid rgba(75,168,224,0.2)', background: 'rgba(75,168,224,0.04)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>🏛️</div>
                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>ELSS Mutual Fund</div>
                        <div style={{ color: 'var(--teal)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>↑ 14-18% p.a.</div>
                        <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '10px' }}>Tax-saving equity linked fund. Lock-in 3 years. Best for long-term wealth & Section 80C benefit.</div>
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(201,151,60,0.1)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, marginBottom: '8px' }}>Risk: Medium</div>
                        <div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>+ Boosts credit profile via stable asset growth</div>
                      </div>
                      <div style={{ border: '1px solid rgba(201,151,60,0.2)', background: 'rgba(201,151,60,0.04)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>🏢</div>
                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>REITs (Real Estate)</div>
                        <div style={{ color: 'var(--teal)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>↑ 8-12% p.a.</div>
                        <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '10px' }}>Invest in commercial real estate without owning property. Quarterly dividends, regulated by SEBI.</div>
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(201,151,60,0.1)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, marginBottom: '8px' }}>Risk: Medium</div>
                        <div style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>+ Fixed income alternative to diversify</div>
                      </div>
                      <div style={{ border: '1px solid rgba(139,114,240,0.2)', background: 'rgba(139,114,240,0.04)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>📊</div>
                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>Nifty 50 Index Fund</div>
                        <div style={{ color: 'var(--teal)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>↑ 12-15% p.a.</div>
                        <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '10px' }}>Low-cost passive fund tracking top 50 Indian companies. Ideal SIP of ₹2,000-5,000/mo.</div>
                      </div>
                      <div style={{ border: '1px solid rgba(160,114,240,0.2)', background: 'rgba(160,114,240,0.04)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>🏦</div>
                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>RBI Floating Rate Bonds</div>
                        <div style={{ color: 'var(--teal)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>↑ 8.05% p.a.</div>
                        <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '10px' }}>Government-backed, zero credit risk. 7-year tenure. Interest resets every 6 months linked to NSC.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="card fade-up fade-up-d1">
                    <div className="ch"><div className="ct"><div className="pip pip-gold" />Asset Allocation</div></div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '10px', color: 'var(--text3)', marginBottom: '20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#38C9B0' }}></span> Fixed Income</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#4BA8E0' }}></span> Equity MF</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#C9973C' }}></span> Direct Equity</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#A072F0' }}></span> Govt Bonds</span>
                    </div>
                    <div style={{ height: '220px', position: 'relative', marginBottom: '20px' }}><canvas id="cht-asset-alloc"></canvas></div>
                    
                    <div style={{ background: 'rgba(56,201,176,0.06)', border: '1px solid rgba(56,201,176,0.2)', padding: '16px', borderRadius: '10px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>📈 Risk Scoring Impact</div>
                      <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.5 }}>Strong investment portfolio reduces assessed default probability by <span style={{ fontWeight: 700, color: 'var(--teal)' }}>~3-5%</span>. Fixed income instruments weighted most positively.</div>
                    </div>
                  </div>

                  <div className="card fade-up fade-up-d2">
                    <div className="ch"><div className="ct">💼 Portfolio Health Check</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text2)' }}>Total Invested</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: '#4BA8E0' }}>₹4,20,000</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text2)' }}>Current Value</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--teal)' }}>₹5,16,200</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text2)' }}>Overall Return</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--teal)' }}>+₹96,200 (+22.9%)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text2)' }}>Best Performer</span><span style={{ fontWeight: 600, color: 'var(--gold)' }}>Reliance Ind. (+34%)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text2)' }}>Fixed Income Weight</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>35%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text2)' }}>Equity Weight</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>54%</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text2)', background: 'var(--bg2)', padding: '12px', borderRadius: '8px' }}>
                      <span>💡</span><span>Tip: Increasing Fixed Income allocation to 45% would further reduce your default risk score by -1.5%.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 'pg-suggest' && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <div>
                <div className="ct" style={{ marginBottom: '16px', fontFamily: "'Fraunces',serif", fontSize: '18px', fontWeight: 700 }}>
                  <div className="pip pip-sky" />Bank Recommendations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="card fade-up" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ fontSize: '24px' }}>💳</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Improve Credit Score to 700+</div>
                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>Model coef: -0.121. Every 50pt improvement reduces risk. Keep credit utilization below 30%, pay dues on time for 3+ months.</div>
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>
                      </div>
                    </div>
                  </div>

                  <div className="card fade-up fade-up-d1" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ fontSize: '24px' }}>📊</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Reduce Loan-to-Income Ratio</div>
                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>Loan_Income_Ratio coef: +0.470 — strongest positive predictor. Keep loan amount below 1.5x annual income.</div>
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>
                      </div>
                    </div>
                  </div>

                  <div className="card fade-up fade-up-d2" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ fontSize: '24px' }}>📉</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Negotiate Lower Interest Rate</div>
                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>InterestRate coef: +0.459 — 2nd strongest predictor. Lower rates directly reduce the model score. Co-signers help secure better rates.</div>
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>
                      </div>
                    </div>
                  </div>

                  <div className="card fade-up fade-up-d3" style={{ border: '1px solid rgba(56,201,176,0.2)', background: 'rgba(56,201,176,0.02)', padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ fontSize: '24px' }}>⏰</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Stay Employed Longer</div>
                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>MonthsEmployed coef: -0.339 — 4th strongest. Avoid switching jobs within 6 months before application. 48+ months significantly lowers probability.</div>
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(56,201,176,0.1)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>High Impact</div>
                      </div>
                    </div>
                  </div>

                  <div className="card fade-up fade-up-d4" style={{ border: '1px solid rgba(201,151,60,0.2)', background: 'rgba(201,151,60,0.02)', padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ fontSize: '24px' }}>🤝</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text)' }}>Add a Co-Signer</div>
                        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '12px' }}>HasCoSigner_Yes coef: -0.142. Choose co-signer with 720+ credit score, full-time employment, stable income history.</div>
                        <div style={{ display: 'inline-block', fontSize: '10px', background: 'rgba(201,151,60,0.1)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Med Impact</div>
                      </div>
                    </div>
                  </div>

                  <div className="card fade-up fade-up-d5" style={{ border: '1px solid rgba(201,151,60,0.2)', background: 'rgba(201,151,60,0.02)', padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ fontSize: '24px' }}>🏠</div>
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
                  <input type="range" min="5000" max="2500000" value={opt.loanAmt} onChange={e => setOpt({...opt, loanAmt: +e.target.value})} style={{ width: '100%', marginBottom: '4px', accentColor: 'var(--gold)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text2)' }}>
                    <span>5K</span><span>₹{fmt(opt.loanAmt)}</span><span>25L</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Credit Score</div>
                  <input type="range" min="300" max="850" value={opt.credit} onChange={e => setOpt({...opt, credit: +e.target.value})} style={{ width: '100%', marginBottom: '4px', accentColor: 'var(--gold)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text2)' }}>
                    <span>300</span><span>{opt.credit}</span><span>850</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>DTI Ratio</div>
                  <input type="range" min="0" max="0.9" step="0.01" value={opt.dti} onChange={e => setOpt({...opt, dti: +e.target.value})} style={{ width: '100%', marginBottom: '4px', accentColor: 'var(--gold)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: "'JetBrains Mono',monospace", color: 'var(--text2)' }}>
                    <span>0.00</span><span>{opt.dti.toFixed(2)}</span><span>0.90</span>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Employment Type</div>
                  <select className="inp" style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--bg2)' }} value={opt.empType} onChange={e => setOpt({...opt, empType: e.target.value})}>
                    <option value="full">Full-time</option>
                    <option value="self">Self-employed</option>
                    <option value="part">Part-time</option>
                    <option value="unemp">Unemployed</option>
                  </select>
                </div>

                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '30px' }}>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: '48px', fontWeight: 700, color: optProb < 0.3 ? 'var(--teal)' : optProb < 0.6 ? 'var(--gold)' : 'var(--rose)', marginBottom: '4px' }}>
                    {Math.round(optProb * 100)}%
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: optProb < 0.3 ? 'var(--teal)' : optProb < 0.6 ? 'var(--gold)' : 'var(--rose)' }}>
                    {optProb < 0.3 ? '✅ Low Risk' : optProb < 0.6 ? '⚠️ Medium Risk' : '❌ High Risk'}
                  </div>
                </div>
                
                <div style={{ height: '240px', position: 'relative', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginLeft: '30px' }}>
                  {/* Y Axis labels */}
                  <div style={{ position: 'absolute', left: '-30px', top: '-6px', bottom: '-6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>
                    <span>80%</span><span>70%</span><span>60%</span><span>50%</span><span>40%</span><span>30%</span><span>20%</span><span>10%</span><span>0%</span>
                  </div>
                  {/* Horizontal grid lines */}
                  {Array.from({length:9}).map((_,i) => (
                    <div key={i} style={{ position: 'absolute', top: `${(i/8)*100}%`, left: 0, right: 0, height: '1px', background: 'var(--border)' }}></div>
                  ))}
                  {/* Dynamic dot marker */}
                  {optProb*100 >= 0 && optProb*100 <= 80 && (
                    <div style={{ position: 'absolute', left: '10px', bottom: `${((optProb*100) / 80) * 100}%`, width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--text)', background: 'var(--bg)', transform: 'translateY(5px)' }} />
                  )}
                  {optProb*100 > 80 && (
                    <div style={{ position: 'absolute', left: '10px', top: '0', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--rose)', background: 'var(--bg)', transform: 'translateY(-5px)' }} />
                  )}
                  {/* X axis labels */}
                  <div style={{ position: 'absolute', left: '12px', bottom: '-20px', fontSize: '10px', color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>#1</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button className="ai-fab" onClick={() => setIsAiOpen(!isAiOpen)}>
        <span>🤖</span>
      </button>
      <ArthaAI isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
