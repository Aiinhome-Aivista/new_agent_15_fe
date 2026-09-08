import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/Button/Button';
import styles from './AppLayout.module.css';

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/projects', label: 'Projects', icon: '📁' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>DEVAA.</div>
        </div>
        
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className={styles.sidebarFooter}>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
            {user?.role} Access
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
          </div>
          
          <div className={styles.headerActions}>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </Button>
            
            <div className={styles.userProfile}>
              <div className={styles.avatar}>
                {getInitials(user?.name)}
              </div>
              <Button variant="secondary" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>
        
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
