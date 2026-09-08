import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card/Card';
import { Input } from '../components/ui/Input/Input';
import { Button } from '../components/ui/Button/Button';
import styles from './LoginPage.module.css';

const ROLE_HOME = {
  'Product Owner':    '/po/dashboard',
  'Engineering Lead': '/lead/dashboard',
  'QA Reviewer':      '/qa/dashboard',
  'Admin':            '/admin/dashboard',
};

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      // Get updated user from context — AuthContext sets user on login
      const role = result.user?.role || result.role;
      const dest = ROLE_HOME[role] || '/dashboard';
      navigate(dest);
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard}>
        <Card.Header>
          <Card.Title>Sign In to DEVAA</Card.Title>
          <Card.Description>Enter your credentials to access the agent workspace.</Card.Description>
        </Card.Header>
        
        <form onSubmit={handleSubmit}>
          <Card.Content>
            {error && <div className={styles.alert}>{error}</div>}
            
            <div className={styles.form}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="po@devaa.local"
                required
                disabled={isSubmitting}
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
              />
            </div>
          </Card.Content>
          
          <Card.Footer style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </Button>
          </Card.Footer>
        </form>
      </Card>

      <div className={styles.quickLogins}>
        <h4 className={styles.quickLoginsTitle}>Demo Accounts (Click to auto-fill)</h4>
        <div className={styles.quickLoginsGrid}>
          {[
            { label: '🧑‍💼 Product Owner',    email: 'po@devaa.local',    role: 'Product Owner' },
            { label: '👨‍💻 Engineering Lead', email: 'lead@devaa.local',  role: 'Engineering Lead' },
            { label: '🔍 QA Reviewer',        email: 'qa@devaa.local',    role: 'QA Reviewer' },
            { label: '⚙️ Admin',              email: 'admin@devaa.local', role: 'Admin' },
          ].map(p => (
            <Button
              key={p.role}
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={async () => {
                setEmail(p.email);
                setPassword('Devaa@2024');
                setError('');
                setIsSubmitting(true);
                const result = await login(p.email, 'Devaa@2024');
                if (result.success) {
                  navigate(ROLE_HOME[p.role]);
                } else {
                  setError(result.error);
                  setIsSubmitting(false);
                }
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
