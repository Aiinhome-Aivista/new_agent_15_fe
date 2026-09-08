import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { fetchWorkflows } from '../services/api';

export const Dashboard = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchWorkflows();
        setWorkflows(data);
      } catch (err) {
        setError('Failed to load workflows.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome back, <strong>{user?.name}</strong> ({user?.role})
          </p>
        </div>
        
        {['Product Owner', 'Admin'].includes(user?.role) && (
          <Link to="/workflows/new">
            <Button>+ New Workflow</Button>
          </Link>
        )}
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Active Workflows</Card.Title>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#ef4444' }}>{error}</div>
          ) : workflows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-placeholder)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
              <p>No active workflows found.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Create a new workflow to start the agent planning process.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {workflows.map(wf => (
                <div key={wf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: 'var(--bg-input)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-orange-primary)' }}>{wf.title}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Status: {wf.status} | Created: {new Date(wf.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Link to={`/workflows/${wf.id}`}>
                    <Button variant="outline" size="sm">View Details</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};
