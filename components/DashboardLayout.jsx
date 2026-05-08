"use client";
import { useState } from 'react';
import { useStateContext } from './StateContext';
import DashboardView from './DashboardView';

export default function DashboardLayout() {
  const { user, logout, state, authFetch, fetchState, Toast } = useStateContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');

  // We will build the individual views as sub-components
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <h1>{user?.username}&apos;s Personal Tracker.</h1>
        </div>
        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)' }}>
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>Insights</button>
          <button className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>Savings Goals</button>
          <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>Audit Logs</button>
          <div style={{ flexGrow: 1 }}></div>
          <button className="tab-btn" onClick={logout} style={{ color: 'var(--color-danger)', marginTop: 'auto' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-bar">
          <div className="net-worth-header">
            <span>Net Worth: </span><strong>₱0.00</strong>
          </div>
          <div className="month-selector" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="icon-btn" onClick={() => {
              const newTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(newTheme);
              document.documentElement.setAttribute('data-theme', newTheme);
            }} style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-soft)', width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-main)' }}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <input type="month" className="month-input" />
          </div>
        </header>

        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'insights' && <p>Insights View Coming Soon</p>}
        {activeTab === 'goals' && <p>Goals View Coming Soon</p>}
        {activeTab === 'logs' && <p>Logs View Coming Soon</p>}
      </div>
    </div>
  );
}
