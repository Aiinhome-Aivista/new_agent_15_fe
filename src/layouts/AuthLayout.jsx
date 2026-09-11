import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/Button/Button';
import { Moon, Sun } from 'lucide-react';
import styles from './AuthLayout.module.css';

export const AuthLayout = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>DEVAA</Link>
        <Button variant="outline" size="sm" onClick={toggleTheme} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          {theme === 'light' ? <><Moon size={14} /> Dark</> : <><Sun size={14} /> Light</>}
        </Button>
      </header>
      
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};
