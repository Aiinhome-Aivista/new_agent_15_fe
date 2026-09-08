import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card/Card';
import { Input } from '../components/ui/Input/Input';
import { Button } from '../components/ui/Button/Button';
import { initiateWorkflow } from '../services/api';

export const NewWorkflow = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !requirements) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await initiateWorkflow({ title, requirements, provider });
      navigate(`/workflows/${result.workflow_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate workflow');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Initiate Workflow</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Submit raw requirements to trigger the Architecture Planning agent.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <Card.Content style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && <div style={{ color: '#ef4444', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>{error}</div>}
            
            <Input
              label="Project Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. E-Commerce Cart Refactor"
              required
              disabled={loading}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Provider Preference</label>
              <select 
                value={provider}
                onChange={e => setProvider(e.target.value)}
                disabled={loading}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
              >
                <option value="gemini">Google Gemini (Default)</option>
                <option value="local">Local/Custom LLM</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Requirements Document</label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="Describe the feature or project requirements in detail..."
                required
                disabled={loading}
                style={{ 
                  minHeight: '200px', 
                  padding: '0.75rem', 
                  borderRadius: '4px', 
                  border: '1px solid var(--border-light)', 
                  backgroundColor: 'var(--bg-input)', 
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </Card.Content>
          <Card.Footer style={{ justifyContent: 'flex-end', gap: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Initializing Agents...' : 'Submit to Architecture Agent'}
            </Button>
          </Card.Footer>
        </form>
      </Card>
    </div>
  );
};
