import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { fetchWorkflowDetails } from '../services/api';

export const WorkflowDetail = () => {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await fetchWorkflowDetails(id);
        setWorkflow(data);
      } catch (err) {
        setError('Failed to load workflow details.');
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Agent Workspace...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
  if (!workflow) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/dashboard" style={{ fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>
            &larr; Back to Dashboard
          </Link>
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-orange-primary)' }}>{workflow.title}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Status: <strong>{workflow.status}</strong> | Initiated by: {workflow.owner}
          </p>
        </div>
      </div>

      {/* Steps Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Agent Execution Log</h2>
        
        {workflow.steps.length === 0 ? (
          <p style={{ color: 'var(--text-placeholder)' }}>No steps executed yet.</p>
        ) : (
          workflow.steps.map((step, index) => (
            <Card key={step.id} style={{ borderLeft: `4px solid ${step.status === 'Completed' ? 'var(--color-orange-primary)' : step.status === 'Failed' ? '#ef4444' : 'var(--border-light)'}` }}>
              <Card.Header>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Card.Title>Step {index + 1}: {step.type} Agent</Card.Title>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {step.status} | {new Date(step.created_at).toLocaleString()}
                  </span>
                </div>
              </Card.Header>
              <Card.Content>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Prompt</h4>
                  <div style={{ backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                    {step.response ? "Prompt executed successfully." : step.prompt}
                  </div>
                </div>
                
                {step.response && (
                  <div>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Output</h4>
                    <div className="markdown-body" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '4px' }}>
                      <ReactMarkdown>{step.response}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
