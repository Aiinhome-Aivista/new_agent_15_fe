import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/Button/Button';
import styles from './AuthLayout.module.css';

export const AuthLayout = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>DEVAA</Link>
        <Button variant="outline" size="sm" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </Button>
      </header>
      
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};
