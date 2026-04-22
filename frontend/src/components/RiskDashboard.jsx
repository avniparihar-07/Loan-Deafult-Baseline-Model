import React from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';

ChartJS.register(...registerables);

export default function RiskDashboard() {
  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { 
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#A4B0C8' } },
      x: { grid: { display: false }, ticks: { color: '#A4B0C8' } }
    }
  };

  const distData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [{
      data: [61.2, 27.3, 11.5],
      backgroundColor: ['#38C9B0', '#C9973C', '#E85475'],
      borderWidth: 0
    }]
  };

  const trendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Volume',
      data: [420, 580, 490, 710, 640, 890],
      borderColor: '#4BA8E0',
      tension: 0.4
    }, {
      label: 'Default Rate',
      data: [11, 10, 12, 11, 13, 11],
      borderColor: '#E85475',
      tension: 0.4
    }]
  };

  return (
    <div className="risk-dashboard">
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 30 }}>
        {[
          { label: 'Total Assessed', val: '255,347', sub: '↑ 12% MoM', color: 'var(--sky)' },
          { label: 'Baseline Defaults', val: '11.6%', sub: 'Model Constant', color: 'var(--rose)' },
          { label: 'Avg Credit Score', val: '574', sub: 'Dataset Median', color: 'var(--gold)' },
          { label: 'ROC-AUC Score', val: '0.760', sub: 'LogReg Precision', color: 'var(--teal)' }
        ].map((kpi, i) => (
          <div key={i} className="card glass">
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{kpi.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, margin: '8px 0', color: kpi.color }}>{kpi.val}</p>
            <p style={{ fontSize: 10, color: 'var(--text2)' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        <div className="card glass">
          <h3 style={{ marginBottom: 20 }}>Monthly Assessment Volume vs Default Trend</h3>
          <div style={{ height: 250 }}><Line data={trendData} options={chartOptions} /></div>
        </div>
        <div className="card glass">
          <h3 style={{ marginBottom: 20 }}>Risk Level Distribution</h3>
          <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}><Doughnut data={distData} options={{ ...chartOptions, cutout: '70%' }} /></div>
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
              <span>🟢 Low Risk (&lt;15%)</span><span>61.2%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
              <span>🟡 Medium Risk (15-40%)</span><span>27.3%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>🔴 High Risk (&gt;40%)</span><span>11.5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
