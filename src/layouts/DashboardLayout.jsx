import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Bot, LogOut, User, Moon, Sun } from 'lucide-react';
import '../styles/dashboard.css';

export function DashboardLayout({ title, personaClass, tabs, activeTab, onTabChange, children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="da-page">
      <div className="da-page-layout">
        {/* Sidebar */}
        <div className="da-sidebar">
          <div className="da-sidebar-header">
            <span className="da-logo" style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'var(--da-accent)', color: '#FFF', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} strokeWidth={2.5} />
              </div>
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
              <LogOut size={16} style={{ marginRight: '0.75rem' }} /> Logout
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
              <button 
                type="button"
                className="da-theme-toggle" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                style={{
                  background: 'var(--da-surface-2)',
                  border: '1px solid var(--da-border)',
                  color: 'var(--da-text)',
                  borderRadius: 'var(--da-radius-sm)',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {theme === 'light' ? <><Moon size={14} /> Dark</> : <><Sun size={14} /> Light</>}
              </button>
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
