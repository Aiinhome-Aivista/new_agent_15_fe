import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Check, LogOut, User } from 'lucide-react';
import '../styles/dashboard.css';

export function DashboardLayout({ title, personaClass, tabs, activeTab, onTabChange, children }) {
  const { user, logout } = useAuth();
  
  return (
    <div className="da-page">
      <div className="da-page-layout">
        {/* Sidebar */}
        <div className="da-sidebar">
          <div className="da-sidebar-header">
            <span className="da-logo" style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'var(--da-accent)', color: '#FFF', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} strokeWidth={3} /></div>
              DEVAA
            </span>
          </div>
          <div className="da-sidebar-nav">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={`da-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>
          <div className="da-sidebar-footer">
            <button className="da-sidebar-logout" onClick={logout}>
              <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Logout
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="da-main-wrapper">
          <header className="da-header">
            <div className="da-header-left">
              <span className={`da-persona-badge ${personaClass}`}>{title}</span>
            </div>
            <div className="da-header-right">
              <span className="da-user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> {user?.name}</span>
            </div>
          </header>
          <div className="da-main-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
