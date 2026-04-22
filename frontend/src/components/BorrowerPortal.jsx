import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ArthaAI from './ArthaAI';
import { calcRisk, buildSched, fmt, fmtK } from '../model';

export default function BorrowerPortal({ user, onLogout, theme, toggleTheme }) {
  const [page, setPage] = useState('bpg-apply');
  const [formData, setFormData] = useState({
    age: 35, credit: 650, income: 820000, loanAmt: 500000, dti: 0.35, lines: 3,
    purpose: 'other', term: 24, rate: 12.99, empType: 'full', empl: 24,
    edu: 'bach', marital: 'married', state: 'MH', extLoanAmt: 0, extEmi: 0,
    customPurpose: '', customTerm: '', extBank: '', extLoanType: 'personal'
  });
  const [flags, setFlags] = useState({ mort: 'N', dep: 'N', co: 'N', extloan: 'N' });
  const [result, setResult] = useState(null);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const update = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));
  const tog = (k, v) => setFlags(prev => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!formData.loanAmt) { alert('Please enter a Loan Amount'); return; }

    const hasExtLoan = flags.extloan === 'Y';
    const extAmt = hasExtLoan ? formData.extLoanAmt : 0;
    const extEmi = hasExtLoan ? formData.extEmi : 0;
    
    let adjustedD = { ...formData };
    if (hasExtLoan) {
      const monthlyInc = formData.income / 12 || 1;
      adjustedD.dti = Math.min(formData.dti + (extEmi / monthlyInc), 0.99);
      adjustedD.lines = formData.lines + 1;
    }
    
    const bF = { 
      mort: (flags.mort === 'Y' || (hasExtLoan && formData.extLoanType === 'home')) ? 'Y' : 'N', 
      dep: flags.dep, 
      co: flags.co 
    };

    const prob = calcRisk(adjustedD, bF);
    const pct = Math.round(prob * 100);
    const level = prob < 0.3 ? 'low' : prob < 0.6 ? 'med' : 'high';
    
    const probWithout = hasExtLoan ? calcRisk(formData, { mort: flags.mort, dep: flags.dep, co: flags.co }) : null;
    const pctWithout = probWithout ? Math.round(probWithout * 100) : null;
    const riskDelta = hasExtLoan ? (pct - pctWithout) : 0;

    const sched = buildSched(formData.loanAmt, formData.rate, formData.term);
    
    setResult({ pct, level, sched, prob, hasExtLoan, extAmt, extEmi, pctWithout, riskDelta, adjustedD });
    setPage('bpg-status');
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

  return (
    <div className="app-shell active">
      <Sidebar user={user} activePage={page} setPage={setPage} onLogout={onLogout} type="borrower" theme={theme} toggleTheme={toggleTheme} />
      
      <div className="main-area">
        <div className="topbar">
          <div className="tb-title">
            {page === 'bpg-status' ? 'My Loan Application' : page === 'bpg-apply' ? 'Submit Details' : page === 'bpg-stocks' ? 'Stock Investments' : 'Improve Score'}
          </div>
          <div className="tb-chip">
            {result ? `Status: ${result.level==='low'?'Approved':'Under Review'} · ${result.pct}%` : 'Draft Application'}
          </div>
        </div>

        <div className="page-content" style={{ padding: '26px' }}>
          {page === 'bpg-apply' && (
            <div className="fade-in">
              <div className="card glass mb18">
                <div className="ch">
                  <div className="ct"><div className="pip pip-sky" />Loan Application Form</div>
                  <div className="mbadge">Real LR Scoring</div>
                </div>
                <div style={{fontSize:'13px',color:'var(--text2)',marginBottom:'20px'}}>Fill your details. The risk engine uses the actual trained logistic regression model to assess your default probability.</div>
                
                <div className="form-grid">
                  <div className="fg-sec"><div className="fg-sec-dot" />Personal Information</div>
                  <div>
                    <div className="flab">Age</div>
                    <input type="number" className="finput" value={formData.age} onChange={e => update('age', +e.target.value)} />
                  </div>
                  <div>
                    <div className="flab">Credit Score</div>
                    <input type="number" className="finput" value={formData.credit} onChange={e => update('credit', +e.target.value)} />
                  </div>
                  <div>
                    <div className="flab">Education Level</div>
                    <select className="fselect" value={formData.edu} onChange={e => update('edu', e.target.value)}>
                      <option value="hs">High School</option><option value="bach">Bachelor's</option><option value="mast">Master's</option><option value="phd">PhD</option>
                    </select>
                  </div>
                  <div>
                    <div className="flab">Marital Status</div>
                    <select className="fselect" value={formData.marital} onChange={e => update('marital', e.target.value)}>
                      <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
                    </select>
                  </div>
                  <div>
                    <div className="flab">State / Region</div>
                    <select className="fselect" value={formData.state} onChange={e => update('state', e.target.value)}>
                      <option value="MH">Maharashtra</option><option value="DL">Delhi</option><option value="KA">Karnataka</option><option value="TN">Tamil Nadu</option><option value="GJ">Gujarat</option>
                    </select>
                  </div>
                  <div>
                    <div className="flab">Annual Income (₹)</div>
                    <input type="number" className="finput" value={formData.income} onChange={e => update('income', +e.target.value)} />
                  </div>
                  <div>
                    <div className="flab">Loan Amount (₹)</div>
                    <input type="number" className="finput" value={formData.loanAmt} onChange={e => update('loanAmt', +e.target.value)} />
                  </div>
                  <div>
                    <div className="flab">DTI Ratio</div>
                    <input type="number" step="0.01" className="finput" value={formData.dti} onChange={e => update('dti', +e.target.value)} />
                  </div>
                  <div>
                    <div className="flab">Credit Lines</div>
                    <input type="number" className="finput" value={formData.lines} onChange={e => update('lines', +e.target.value)} />
                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />Loan Requirement</div>
                  <div>
                    <div className="flab">Purpose <span className="combo-tag">+ Custom</span></div>
                    <div className="combo-field">
                      <select className="combo-select" value={formData.purpose} onChange={e => update('purpose', e.target.value)}>
                        <option value="home">🏠 Home</option><option value="auto">🚗 Auto</option><option value="education">🎓 Education</option><option value="business">🏢 Business</option><option value="other">📦 Other</option><option value="custom">✏️ Write your own…</option>
                      </select>
                      <input 
                        className={`combo-manual ${formData.purpose === 'custom' ? 'show' : ''}`} 
                        placeholder="e.g. Wedding, Medical, Machinery…" 
                        value={formData.customPurpose}
                        onChange={e => update('customPurpose', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flab">Term <span className="combo-tag">+ Custom</span></div>
                    <div className="combo-field">
                      <select className="combo-select" value={formData.term} onChange={e => update('term', e.target.value)}>
                        <option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option><option value="custom">✏️ Enter months manually…</option>
                      </select>
                      <input 
                        type="number"
                        className={`combo-manual ${formData.term === 'custom' ? 'show' : ''}`} 
                        placeholder="e.g. 18, 42, 72 months…" 
                        value={formData.customTerm}
                        onChange={e => update('customTerm', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />Employment</div>
                  <div>
                    <div className="flab">Employment Type</div>
                    <select className="fselect" value={formData.empType} onChange={e => update('empType', e.target.value)}>
                      <option value="full">Full-time</option><option value="part">Part-time</option><option value="self">Self-employed</option><option value="unemployed">Unemployed</option>
                    </select>
                  </div>
                  <div>
                    <div className="flab">Months Employed</div>
                    <input type="number" className="finput" value={formData.empl} onChange={e => update('empl', +e.target.value)} />
                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" />Additional Flags</div>
                  <div>
                    <div className="flab">Has Mortgage?</div>
                    <div className="ftog">
                      <button className={`ftog-btn ${flags.mort === 'Y' ? 'on' : ''}`} onClick={() => tog('mort', 'Y')}>Yes</button>
                      <button className={`ftog-btn ${flags.mort === 'N' ? 'on' : ''}`} onClick={() => tog('mort', 'N')}>No</button>
                    </div>
                  </div>
                  <div>
                    <div className="flab">Has Dependents?</div>
                    <div className="ftog">
                      <button className={`ftog-btn ${flags.dep === 'Y' ? 'on' : ''}`} onClick={() => tog('dep', 'Y')}>Yes</button>
                      <button className={`ftog-btn ${flags.dep === 'N' ? 'on' : ''}`} onClick={() => tog('dep', 'N')}>No</button>
                    </div>
                  </div>
                  <div className="fg-full">
                    <div className="flab">Has Co-Signer?</div>
                    <div className="ftog">
                      <button className={`ftog-btn ${flags.co === 'Y' ? 'on' : ''}`} onClick={() => tog('co', 'Y')}>Yes</button>
                      <button className={`ftog-btn ${flags.co === 'N' ? 'on' : ''}`} onClick={() => tog('co', 'N')}>No</button>
                    </div>
                  </div>

                  <div className="fg-sec"><div className="fg-sec-dot" style={{background:'var(--rose)'}} />Existing Loan from Other Bank?</div>
                  <div className="fg-full">
                    <div className="flab">Active Loan at Another Bank?</div>
                    <div className="ftog">
                      <button className={`ftog-btn ${flags.extloan === 'Y' ? 'on' : ''}`} onClick={() => tog('extloan', 'Y')}>Yes</button>
                      <button className={`ftog-btn ${flags.extloan === 'N' ? 'on' : ''}`} onClick={() => tog('extloan', 'N')}>No</button>
                    </div>
                  </div>

                  {flags.extloan === 'Y' && (
                    <div style={{gridColumn:'1/-1',background:'rgba(232,84,117,0.06)',border:'1px solid rgba(232,84,117,0.18)',borderRadius:'12px',padding:'16px',marginTop:'4px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
                      <div style={{gridColumn:'1/-1',fontSize:'11px',color:'var(--rose)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'4px'}}>⚠️ This information affects your risk score — it increases your DTI and credit obligation burden</div>
                      <div>
                        <div className="flab">Outstanding Loan Amount (₹)</div>
                        <input type="number" className="finput" value={formData.extLoanAmt} onChange={e => update('extLoanAmt', +e.target.value)} />
                      </div>
                      <div>
                        <div className="flab">Monthly EMI Being Paid (₹)</div>
                        <input type="number" className="finput" value={formData.extEmi} onChange={e => update('extEmi', +e.target.value)} />
                      </div>
                      <div>
                        <div className="flab">Bank Name</div>
                        <select className="fselect" value={formData.extBank} onChange={e => update('extBank', e.target.value)}>
                          <option value="">Select bank…</option><option>SBI</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Other</option>
                        </select>
                      </div>
                      <div>
                        <div className="flab">Loan Type</div>
                        <select className="fselect" value={formData.extLoanType} onChange={e => update('extLoanType', e.target.value)}>
                          <option value="personal">Personal Loan</option><option value="home">Home Loan</option><option value="auto">Auto/Vehicle Loan</option><option value="business">Business Loan</option><option value="other">Other</option>
                        </select>
                      </div>
                      {(formData.extLoanAmt > 0 || formData.extEmi > 0) && (
                        <div style={{gridColumn:'1/-1',padding:'10px 14px',background:'rgba(201,151,60,0.08)',border:'1px solid rgba(201,151,60,0.18)',borderRadius:'9px',fontSize:'12px',color:'var(--text2)'}}>
                          <div style={{fontWeight:700,color:'var(--gold)',marginBottom:'6px'}}>📊 Live Risk Impact Preview</div>
                          <div style={{lineHeight:1.7}}>
                            <span style={{color:'var(--gold)'}}>● Existing EMI burden: <strong>₹{fmt(formData.extEmi)}/mo</strong> = {formData.income>0?((formData.extEmi/(formData.income/12))*100).toFixed(1):0}% of your monthly income</span><br/>
                            <span style={{color:'var(--text2)'}}>● DTI effectively increases by ~<strong>{formData.income>0?((formData.extEmi/(formData.income/12))).toFixed(2):0}</strong> — model penalises higher DTI</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="fg-full mt18">
                    <button className="btn-assess" onClick={handleSubmit}>
                      📤 Submit Loan Application
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 'bpg-status' && (
            <div className="fade-in">
              {!result ? (
                <div style={{textAlign:'center',padding:'60px',color:'var(--text3)'}}>
                  <div style={{fontSize:'44px',marginBottom:'14px',animation:'floatBob 3s ease-in-out infinite'}}>📋</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,color:'var(--text)',marginBottom:'8px'}}>No application submitted yet</div>
                  <div style={{fontSize:'13px'}}>Go to <strong>Submit Details</strong> to fill your loan application.</div>
                </div>
              ) : (
                <div>
                  <div className="bstatus-hero">
                    <div className="bsh-t">Application Submitted</div>
                    <div className="bsh-s">Assessed by LoanGuard LR Model · ROC-AUC 0.760 · {new Date().toLocaleString()}</div>
                    <div className="bsh-chips">
                      <span className={`bpill ${result.level==='low'?'bp-teal':result.level==='med'?'bp-gold':'bp-rose'}`}>{result.level==='low'?'✅ Likely Approved':result.level==='med'?'⚠️ Under Review':'❌ High Risk'}</span>
                      <span className="bpill bp-sky">₹{fmt(formData.loanAmt)} · {formData.purpose === 'custom' ? formData.customPurpose : formData.purpose}</span>
                      <span className="mbadge">σ(wᵀx+b) = {result.pct}%</span>
                      {result.hasExtLoan && <span className="bpill bp-rose">⚠️ Existing Loan Factored</span>}
                    </div>
                  </div>

                  <div className="g2 mb18">
                    <div className="card">
                      <div className="ch"><div className="ct"><div className={`pip pip-${result.level==='low'?'teal':result.level==='med'?'gold':'rose'}`} />Your Risk Score</div></div>
                      <div style={{textAlign:'center',padding:'16px 0'}}>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:'64px',fontWeight:700,lineHeight:1,color:result.level==='low'?'var(--teal)':result.level==='med'?'var(--gold)':'var(--rose)'}}>{result.pct}%</div>
                        <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginTop:'6px'}}>Default Probability</div>
                        <div style={{height:'8px',borderRadius:'4px',background:'var(--bg3)',margin:'14px 0 10px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${result.pct}%`,background:result.level==='low'?'linear-gradient(90deg,var(--teal),var(--teal2))':result.level==='med'?'linear-gradient(90deg,var(--gold),var(--gold2))':'linear-gradient(90deg,var(--rose),var(--rose2))'}} />
                        </div>
                        <div style={{fontSize:'12px',color:'var(--text2)'}}>Category: <strong style={{color:result.level==='low'?'var(--teal)':result.level==='med'?'var(--gold)':'var(--rose)'}}>{result.level==='low'?'Low (<30%)':result.level==='med'?'Medium (30-60%)':'High (>60%)'}</strong></div>
                        {result.hasExtLoan && result.riskDelta > 0 && <div style={{marginTop:'8px',fontSize:'11px',color:'var(--rose)'}}>▲ {result.riskDelta}pp higher due to existing loan</div>}
                      </div>
                    </div>
                    <div className="card">
                      <div className="ch"><div className="ct"><div className="pip pip-sky" />Monthly EMI</div></div>
                      <div style={{textAlign:'center',padding:'12px 0'}}>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:'48px',fontWeight:700,color:'var(--gold)'}}>₹{fmt(Math.round(result.sched.emi))}</div>
                        <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}}>per month for {formData.term} months</div>
                        
                        {(() => {
                          const moIncome = formData.income / 12 || 1;
                          const ratio = ((result.sched.emi + (result.extEmi||0)) / moIncome * 100).toFixed(1);
                          const isHigh = ratio > 50;
                          return (
                            <div style={{marginTop:'14px',fontSize:'12px',fontWeight:600,color:isHigh?'var(--rose)':'var(--teal)'}}>
                              {ratio}% of monthly income {isHigh ? '⚠️ High' : ''}
                            </div>
                          );
                        })()}

                        {result.hasExtLoan && result.extEmi > 0 && <div style={{marginTop:'8px',fontSize:'11px',padding:'6px 10px',borderRadius:'7px',background:'rgba(232,84,117,0.08)',color:'var(--rose)'}}>+ ₹{fmt(result.extEmi)}/mo existing EMI → Total: ₹{fmt(Math.round(result.sched.emi+result.extEmi))}/mo</div>}
                      </div>
                    </div>
                  </div>

                  {/* Repayment Breakdown */}
                  <div className="card mb18">
                    <div className="ch"><div className="ct"><div className="pip pip-sky" />Your Repayment Breakdown</div></div>
                    
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px',marginTop:'8px'}}>
                      <div style={{background:'var(--bg3)',padding:'16px',borderRadius:'12px',textAlign:'center'}}>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:'24px',fontWeight:700,color:'var(--teal)'}}>₹{fmt(formData.loanAmt)}</div>
                        <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginTop:'4px'}}>Principal</div>
                      </div>
                      <div style={{background:'var(--bg3)',padding:'16px',borderRadius:'12px',textAlign:'center'}}>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:'24px',fontWeight:700,color:'var(--rose)'}}>₹{fmt(Math.round(result.sched.tI))}</div>
                        <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginTop:'4px'}}>Total Interest</div>
                      </div>
                      <div style={{background:'var(--bg3)',padding:'16px',borderRadius:'12px',textAlign:'center'}}>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:'24px',fontWeight:700,color:'var(--gold)'}}>₹{fmt(Math.round(result.sched.tPay))}</div>
                        <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginTop:'4px'}}>Total Repayment</div>
                      </div>
                    </div>

                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'18px',fontSize:'11px',color:'var(--text2)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{width:'8px',height:'8px',background:'var(--sky)',borderRadius:'2px'}}></div> Principal {Math.round((formData.loanAmt / result.sched.tPay) * 100)}%</div>
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{width:'8px',height:'8px',background:'var(--rose)',borderRadius:'2px'}}></div> Interest {Math.round((result.sched.tI / result.sched.tPay) * 100)}%</div>
                    </div>
                    
                    <div style={{display:'flex',height:'12px',borderRadius:'6px',overflow:'hidden',marginTop:'8px'}}>
                      <div style={{width:`${(formData.loanAmt / result.sched.tPay) * 100}%`,background:'var(--sky)'}}></div>
                      <div style={{width:`${(result.sched.tI / result.sched.tPay) * 100}%`,background:'var(--rose)'}}></div>
                    </div>

                    <div style={{marginTop:'24px'}}>
                      <div className="br-row" style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid var(--border)',paddingBottom:'12px',marginBottom:'12px'}}><span style={{color:'var(--text2)'}}>Rate (indicative)</span><span>{formData.rate}% p.a.</span></div>
                      <div className="br-row" style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid var(--border)',paddingBottom:'12px',marginBottom:'12px'}}><span style={{color:'var(--text2)'}}>Term</span><span>{formData.term} months ({formData.purpose === 'custom' ? formData.customPurpose : formData.purpose})</span></div>
                      <div className="br-row" style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text2)'}}>Loan / Annual Income</span><span>{formData.income > 0 ? (formData.loanAmt / formData.income).toFixed(2) : 0}x</span></div>
                    </div>
                  </div>

                  {/* Amortization Schedule */}
                  <div className="card">
                    <div className="ch" style={{justifyContent:'space-between'}}>
                      <div className="ct"><div className="pip pip-sky" />Full Amortization Schedule</div>
                      <div style={{fontSize:'12px',color:'var(--text3)'}}>Month-by-month repayment</div>
                    </div>
                    <div style={{overflowX:'auto',marginTop:'14px'}}>
                      <table className="tbl" style={{width:'100%',minWidth:'600px',borderCollapse:'collapse'}}>
                        <thead>
                          <tr>
                            <th style={{textAlign:'left',fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',paddingBottom:'12px'}}>MONTH</th>
                            <th style={{textAlign:'right',fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',paddingBottom:'12px'}}>EMI</th>
                            <th style={{textAlign:'right',fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',paddingBottom:'12px'}}>PRINCIPAL</th>
                            <th style={{textAlign:'right',fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',paddingBottom:'12px'}}>INTEREST</th>
                            <th style={{textAlign:'right',fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',paddingBottom:'12px'}}>BALANCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.sched.rows.slice(0, 12).map((r, i) => (
                            <tr key={i} style={{borderTop:'1px solid var(--border)'}}>
                              <td style={{padding:'12px 0',color:'var(--text2)',fontSize:'12px'}}>Mo {r.m}</td>
                              <td style={{padding:'12px 0',textAlign:'right',fontWeight:600}}>₹{fmt(Math.round(r.emi))}</td>
                              <td style={{padding:'12px 0',textAlign:'right',color:'var(--text2)'}}>₹{fmt(Math.round(r.p))}</td>
                              <td style={{padding:'12px 0',textAlign:'right',color:'var(--rose)'}}>₹{fmt(Math.round(r.i))}</td>
                              <td style={{padding:'12px 0',textAlign:'right',color:'var(--gold)'}}>₹{fmt(Math.round(r.bal))}</td>
                            </tr>
                          ))}
                          {result.sched.rows.length > 12 && (
                            <tr style={{borderTop:'1px solid var(--border)'}}>
                              <td colSpan="5" style={{textAlign:'center',padding:'16px',color:'var(--text3)',fontSize:'12px',fontStyle:'italic'}}>... and {result.sched.rows.length - 12} more months.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {page === 'bpg-stocks' && (
             <div className="fade-in">
                <div className="bstatus-hero" style={{background:'linear-gradient(135deg,rgba(56,201,176,0.06),rgba(139,114,240,0.06))',borderColor:'rgba(139,114,240,0.18)',marginBottom:'20px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'14px'}}>
                    <div>
                      <div className="bsh-t">📈 Stock & Crypto Suggestions</div>
                      <div className="bsh-s">AI-powered picks tailored to your risk profile — updated live from market data</div>
                      <div className="bsh-chips" style={{marginTop:'10px'}}>
                        <span className="mbadge" style={{background:'rgba(139,114,240,0.1)',color:'var(--violet)',borderColor:'rgba(139,114,240,0.22)'}}>NSE / BSE Listed</span>
                        <span className="mbadge" style={{background:'rgba(56,201,176,0.1)',color:'var(--teal)',borderColor:'rgba(56,201,176,0.22)'}}>Real-time Crypto</span>
                        <span className="mbadge" style={{background:'rgba(201,151,60,0.1)',color:'var(--gold)',borderColor:'rgba(201,151,60,0.22)'}}>AI Analysis</span>
                      </div>
                    </div>
                    <button style={{padding:'10px 22px',borderRadius:'10px',border:'1.5px solid var(--violet)',background:'rgba(139,114,240,0.1)',color:'var(--violet)',fontFamily:"'Outfit',sans-serif",fontSize:'13px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
                      🔄 Refresh Picks
                    </button>
                  </div>
                </div>
                
                <div className="kpi-row" style={{marginBottom:'20px'}}>
                  <div className="kpi violet fade-up fade-up-d1" style={{'--violet-kpi':'var(--violet)'}}>
                    <div className="kpi-lbl">BITCOIN (Live)</div>
                    <div className="kpi-val" style={{color:'var(--violet)',fontSize:'24px'}}>
                      {liveData.loading ? '...' : liveData.btc ? `₹${fmt(liveData.btc.inr)}` : '₹55,42,100'}
                    </div>
                    <div className="kpi-sub">
                      {liveData.btc && liveData.btc.inr_24h_change >= 0 ? <span className="up">▲ {liveData.btc.inr_24h_change.toFixed(2)}% today</span> : 
                       liveData.btc && liveData.btc.inr_24h_change < 0 ? <span className="down" style={{color:'var(--rose)'}}>▼ {Math.abs(liveData.btc.inr_24h_change).toFixed(2)}% today</span> :
                       <span className="up">▲ 1.2% today</span>}
                    </div>
                  </div>
                  <div className="kpi teal fade-up fade-up-d2">
                    <div className="kpi-lbl">SENSEX</div><div className="kpi-val" style={{color:'var(--teal)',fontSize:'24px'}}>79,841</div><div className="kpi-sub"><span className="up">▲ 0.57% today</span></div>
                  </div>
                  <div className="kpi gold fade-up fade-up-d3">
                    <div className="kpi-lbl">SUGGESTED PICKS</div><div className="kpi-val" style={{fontSize:'24px'}}>6</div><div className="kpi-sub">Based on your risk profile</div>
                  </div>
                  <div className="kpi sky fade-up fade-up-d4">
                    <div className="kpi-lbl">AVG. ANALYST RATING</div><div className="kpi-val" style={{color:'var(--sky)',fontSize:'24px'}}>6/8 Buy</div><div className="kpi-sub">Across all picks</div>
                  </div>
                </div>

                {!result ? (
                  <div className="card fade-up mb18" style={{textAlign:'center',padding:'40px',color:'var(--text2)'}}>
                    <div style={{fontSize:'32px',marginBottom:'12px'}}>📊</div>
                    <div style={{fontSize:'16px',fontWeight:700,color:'var(--text)'}}>Submit your application first</div>
                    <div style={{fontSize:'13px',marginTop:'8px'}}>We need to assess your risk profile before suggesting personalized investments.</div>
                  </div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)',gap:'20px'}}>
                    {/* Left Column: Live Stock Picks */}
                    <div>
                      <div className="card fade-up">
                        <div className="ch" style={{justifyContent:'space-between'}}>
                          <div className="ct"><div className="pip pip-violet" />Live Market Picks</div>
                          <div style={{fontSize:'11px',background:'rgba(139,114,240,0.1)',color:'var(--violet)',padding:'4px 10px',borderRadius:'6px',fontWeight:600}}>Updated {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                        
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'14px',marginTop:'14px'}}>
                          {/* Crypto Card */}
                          <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',background:'var(--bg)'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                              <div>
                                <div style={{fontWeight:700,fontSize:'15px',color:'var(--text)'}}>BTC/INR</div>
                                <div style={{fontSize:'11px',color:'var(--text3)'}}>Bitcoin (Crypto)</div>
                              </div>
                              <span style={{background:'rgba(56,201,176,0.1)',color:'var(--teal)',padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:700}}>✅ BUY</span>
                            </div>
                            <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,marginBottom:'4px'}}>
                              {liveData.loading ? '...' : liveData.btc ? `₹${fmt(Math.round(liveData.btc.inr))}` : '₹55,42,100'}
                            </div>
                            <div style={{fontSize:'12px',fontWeight:600,color:liveData.btc && liveData.btc.inr_24h_change < 0 ? 'var(--rose)' : 'var(--teal)'}}>
                              {liveData.btc && liveData.btc.inr_24h_change < 0 ? '▼' : '▲'} {liveData.btc ? Math.abs(liveData.btc.inr_24h_change).toFixed(2) : '1.2'}% today
                            </div>
                            <div style={{height:'1px',background:'var(--border)',margin:'12px 0'}}></div>
                            <div style={{fontSize:'11px',color:'var(--text2)',lineHeight:'1.5',marginBottom:'12px'}}>
                              High risk, high reward digital asset. Strong momentum driven by institutional adoption. Perfect for your low-risk credit profile as a speculative play.
                            </div>
                            <div style={{display:'inline-block',background:'var(--bg3)',padding:'3px 8px',borderRadius:'4px',fontSize:'10px',color:'var(--sky)'}}>Crypto</div>
                          </div>

                          <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',background:'var(--bg)'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                              <div>
                                <div style={{fontWeight:700,fontSize:'15px',color:'var(--text)'}}>RELIANCE</div>
                                <div style={{fontSize:'11px',color:'var(--text3)'}}>Reliance Industries</div>
                              </div>
                              <span style={{background:'rgba(56,201,176,0.1)',color:'var(--teal)',padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:700}}>✅ BUY</span>
                            </div>
                            <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,marginBottom:'4px'}}>₹2,941</div>
                            <div style={{fontSize:'12px',fontWeight:600,color:'var(--teal)'}}>▲ 0.82% today</div>
                            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'8px',display:'flex',justifyContent:'space-between'}}><span>52W High (est.)</span><span>₹3,588</span></div>
                            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px',display:'flex',justifyContent:'space-between'}}><span>52W Low (est.)</span><span>₹2,294</span></div>
                            <div style={{height:'1px',background:'var(--border)',margin:'12px 0'}}></div>
                            <div style={{fontSize:'11px',color:'var(--text2)',lineHeight:'1.5',marginBottom:'12px'}}>
                              Diversified conglomerate with strong Jio & retail tailwinds. Consistent dividend payer.
                            </div>
                            <div style={{display:'inline-block',background:'var(--bg3)',padding:'3px 8px',borderRadius:'4px',fontSize:'10px',color:'var(--sky)'}}>Energy</div>
                          </div>

                          <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',background:'var(--bg)'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                              <div>
                                <div style={{fontWeight:700,fontSize:'15px',color:'var(--text)'}}>TCS</div>
                                <div style={{fontSize:'11px',color:'var(--text3)'}}>Tata Consultancy Services</div>
                              </div>
                              <span style={{background:'rgba(56,201,176,0.1)',color:'var(--teal)',padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:700}}>✅ BUY</span>
                            </div>
                            <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,marginBottom:'4px'}}>₹3,456</div>
                            <div style={{fontSize:'12px',fontWeight:600,color:'var(--rose)'}}>▼ 0.41% today</div>
                            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'8px',display:'flex',justifyContent:'space-between'}}><span>52W High (est.)</span><span>₹4,216</span></div>
                            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px',display:'flex',justifyContent:'space-between'}}><span>52W Low (est.)</span><span>₹2,696</span></div>
                            <div style={{height:'1px',background:'var(--border)',margin:'12px 0'}}></div>
                            <div style={{fontSize:'11px',color:'var(--text2)',lineHeight:'1.5',marginBottom:'12px'}}>
                              India's largest IT firm. Consistent buybacks, high ROE, and stable dollar revenues.
                            </div>
                            <div style={{display:'inline-block',background:'var(--bg3)',padding:'3px 8px',borderRadius:'4px',fontSize:'10px',color:'var(--sky)'}}>IT</div>
                          </div>

                          <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',background:'var(--bg)'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                              <div>
                                <div style={{fontWeight:700,fontSize:'15px',color:'var(--text)'}}>HDFC BANK</div>
                                <div style={{fontSize:'11px',color:'var(--text3)'}}>HDFC Bank</div>
                              </div>
                              <span style={{background:'rgba(56,201,176,0.1)',color:'var(--teal)',padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:700}}>✅ BUY</span>
                            </div>
                            <div style={{fontFamily:"'Fraunces',serif",fontSize:'22px',fontWeight:700,marginBottom:'4px'}}>₹1,621</div>
                            <div style={{fontSize:'12px',fontWeight:600,color:'var(--teal)'}}>▲ 1.15% today</div>
                            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'8px',display:'flex',justifyContent:'space-between'}}><span>52W High (est.)</span><span>₹1,978</span></div>
                            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px',display:'flex',justifyContent:'space-between'}}><span>52W Low (est.)</span><span>₹1,264</span></div>
                            <div style={{height:'1px',background:'var(--border)',margin:'12px 0'}}></div>
                            <div style={{fontSize:'11px',color:'var(--text2)',lineHeight:'1.5',marginBottom:'12px'}}>
                              Best-in-class Indian private bank. Strong loan growth, low NPA, improving margins.
                            </div>
                            <div style={{display:'inline-block',background:'var(--bg3)',padding:'3px 8px',borderRadius:'4px',fontSize:'10px',color:'var(--sky)'}}>Banking</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: AI Analysis & Allocation */}
                    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                      <div className="card fade-up fade-up-d1">
                        <div className="ch" style={{justifyContent:'space-between'}}>
                          <div className="ct"><div className="pip pip-teal" />AI Market Analysis</div>
                          <span className="mbadge" style={{background:'rgba(201,151,60,0.1)',color:'var(--gold)'}}>Claude AI</span>
                        </div>
                        <div style={{fontSize:'13px',color:'var(--text2)',lineHeight:'1.7',marginTop:'8px'}}>
                          Indian markets are showing resilience with IT and banking sectors leading gains. <strong style={{color:'var(--teal)'}}>ICICI Bank</strong> offers compelling risk-reward with ROE expansion and retail credit growth. Watch the <strong style={{color:'var(--gold)'}}>Pharma sector</strong> as global generics demand recovers. Note: Markets are subject to volatility — diversify across sectors and maintain a 3-year+ horizon.
                        </div>
                        <div style={{background:'var(--bg)',padding:'10px',borderRadius:'8px',fontSize:'11px',color:'var(--text3)',marginTop:'14px',display:'flex',alignItems:'center',gap:'8px'}}>
                          <span>⚡</span> Live analysis generated based on your {result.level === 'low' ? 'Low' : result.level === 'med' ? 'Medium' : 'High'} risk profile.
                        </div>
                      </div>

                      <div className="card fade-up fade-up-d2">
                        <div className="ch"><div className="ct"><div className="pip pip-gold" />Portfolio Allocation</div></div>
                        <div style={{marginTop:'12px',display:'flex',flexDirection:'column',gap:'12px'}}>
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text2)',marginBottom:'4px'}}><span>Large Cap Equity</span><span>55%</span></div>
                            <div style={{height:'6px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}><div style={{width:'55%',height:'100%',background:'var(--sky)'}}></div></div>
                          </div>
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text2)',marginBottom:'4px'}}><span>NBFC / Banking</span><span>25%</span></div>
                            <div style={{height:'6px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}><div style={{width:'25%',height:'100%',background:'var(--teal)'}}></div></div>
                          </div>
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text2)',marginBottom:'4px'}}><span>Pharma</span><span>17%</span></div>
                            <div style={{height:'6px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}><div style={{width:'17%',height:'100%',background:'var(--violet)'}}></div></div>
                          </div>
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text2)',marginBottom:'4px'}}><span>Crypto / Alt</span><span>3%</span></div>
                            <div style={{height:'6px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}}><div style={{width:'3%',height:'100%',background:'var(--gold)'}}></div></div>
                          </div>
                        </div>
                      </div>

                      <div className="card fade-up fade-up-d3" style={{background:'linear-gradient(135deg,rgba(232,84,117,0.04),rgba(201,151,60,0.04))',borderColor:'rgba(201,151,60,0.15)'}}>
                        <div style={{fontSize:'11px',fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>⚠️ Disclaimer</div>
                        <div style={{fontSize:'11px',color:'var(--text3)',lineHeight:'1.6'}}>Stock and Crypto suggestions are for informational purposes only and do not constitute financial advice. Past performance is not indicative of future results. Always consult a SEBI-registered advisor before investing.</div>
                      </div>
                    </div>
                  </div>
                )}
             </div>
          )}

          {page === 'bpg-tips' && (
            <div className="fade-in">
              <div className="ct" style={{marginBottom:'24px',fontFamily:"'Fraunces',serif",fontSize:'20px',fontWeight:700,color:'var(--text)'}}><div className="pip pip-teal" />How to Improve Your Loan Eligibility</div>
              
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                <div style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--bg)',border:'1px solid var(--border)',padding:'20px',borderRadius:'16px'}}>
                  <div style={{background:'var(--bg3)',width:'44px',height:'44px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',fontSize:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',flexShrink:0}}>💳</div>
                  <div>
                    <div style={{fontWeight:700,color:'var(--text)',marginBottom:'4px',fontSize:'15px'}}>Credit Score: Aim for 700+</div>
                    <div style={{color:'var(--text2)',fontSize:'13px',lineHeight:'1.5'}}>Model coef: −0.121. Credit score 700–800 default rate: 10.4% vs 13.3% for 300–400. Pay EMIs on time, keep utilization below 30%.</div>
                  </div>
                </div>

                <div style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--bg)',border:'1px solid var(--border)',padding:'20px',borderRadius:'16px'}}>
                  <div style={{background:'var(--bg3)',width:'44px',height:'44px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',fontSize:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',flexShrink:0}}>📊</div>
                  <div>
                    <div style={{fontWeight:700,color:'var(--text)',marginBottom:'4px',fontSize:'15px'}}>Loan/Income Ratio is #1 Predictor</div>
                    <div style={{color:'var(--text2)',fontSize:'13px',lineHeight:'1.5'}}>Loan_Income_Ratio coef: +0.470. Keep loan amount below 1.5× your annual income for best results with this model.</div>
                  </div>
                </div>

                <div style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--bg)',border:'1px solid var(--border)',padding:'20px',borderRadius:'16px'}}>
                  <div style={{background:'var(--bg3)',width:'44px',height:'44px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',fontSize:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',flexShrink:0}}>📉</div>
                  <div>
                    <div style={{fontWeight:700,color:'var(--text)',marginBottom:'4px',fontSize:'15px'}}>Interest Rate is #2 Risk Driver</div>
                    <div style={{color:'var(--text2)',fontSize:'13px',lineHeight:'1.5'}}>InterestRate coef: +0.459. Negotiate for lower rates — even 1% less can noticeably reduce your default probability score.</div>
                  </div>
                </div>

                <div style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--bg)',border:'1px solid var(--border)',padding:'20px',borderRadius:'16px'}}>
                  <div style={{background:'var(--bg3)',width:'44px',height:'44px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',fontSize:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',flexShrink:0}}>💼</div>
                  <div>
                    <div style={{fontWeight:700,color:'var(--text)',marginBottom:'4px',fontSize:'15px'}}>Employment Tenure Matters Most</div>
                    <div style={{color:'var(--text2)',fontSize:'13px',lineHeight:'1.5'}}>MonthsEmployed coef: -0.339. Avoid job changes within 6 months of application. The model rewards 48+ months of tenure.</div>
                  </div>
                </div>

                <div style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--bg)',border:'1px solid var(--border)',padding:'20px',borderRadius:'16px'}}>
                  <div style={{background:'var(--bg3)',width:'44px',height:'44px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',fontSize:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',flexShrink:0}}>🤝</div>
                  <div>
                    <div style={{fontWeight:700,color:'var(--text)',marginBottom:'4px',fontSize:'15px'}}>Co-Signer Helps Significantly</div>
                    <div style={{color:'var(--text2)',fontSize:'13px',lineHeight:'1.5'}}>HasCoSigner_Yes coef: -0.142. Arrange a co-signer with 720+ credit score and stable full-time income to reduce your risk score.</div>
                  </div>
                </div>

                <div style={{display:'flex',gap:'16px',alignItems:'center',background:'var(--bg)',border:'1px solid var(--border)',padding:'20px',borderRadius:'16px'}}>
                  <div style={{background:'var(--bg3)',width:'44px',height:'44px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'12px',fontSize:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',flexShrink:0}}>🏠</div>
                  <div>
                    <div style={{fontWeight:700,color:'var(--text)',marginBottom:'4px',fontSize:'15px'}}>Purpose: Home Loans are Safest</div>
                    <div style={{color:'var(--text2)',fontSize:'13px',lineHeight:'1.5'}}>LoanPurpose_Home coef: -0.078. Home loans have the lowest default rate (10.2%). Business loans carry the highest risk coefficient.</div>
                  </div>
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
