import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAdminMetrics, fetchAuditLogs, fetchGuardrailEvents, fetchAllWorkflows, fetchUsers, fetchWorkflowSteps } from '../../services/api';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { PieChart, Settings, Shield, ClipboardList, Users, AlertTriangle, X, Terminal, Cpu, Coins, CheckCircle, XCircle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/dashboard.css';

const TABS = [
  { id: 'overview', label: <><PieChart size={16} /> Overview</> },
  { id: 'workflows', label: <><Settings size={16} /> Workflows</> },
  { id: 'guardrails', label: <><Shield size={16} /> Guardrails</> },
  { id: 'audit', label: <><ClipboardList size={16} /> Audit</> },
  { id: 'users', label: <><Users size={16} /> Users</> }
];

const METRIC_LABELS = {
  eligibility_accuracy: 'Eligibility Accuracy',
  acceptance_criteria_coverage: 'Criteria Coverage',
  loop_iterations: 'Avg Loop Iterations',
  guardrail_hits: 'Guardrail Hits',
  rework_count: 'Rework Count',
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [guardrailEvents, setGuardrailEvents] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Workflow step detail modal state
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);

  useEffect(() => { loadTab('overview'); }, []);

  async function loadTab(t) {
    setTab(t); setLoading(true); setError(null);
    try {
      if (t === 'overview' && !metrics) {
        const data = await fetchAdminMetrics();
        setMetrics(data);
      } else if (t === 'audit' && auditLogs.length === 0) {
        const data = await fetchAuditLogs({ limit: 100 });
        setAuditLogs(data);
      } else if (t === 'guardrails' && guardrailEvents.length === 0) {
        const data = await fetchGuardrailEvents({ limit: 100 });
        setGuardrailEvents(data);
      } else if (t === 'workflows' && workflows.length === 0) {
        const data = await fetchAllWorkflows();
        setWorkflows(data);
      } else if (t === 'users' && users.length === 0) {
        const data = await fetchUsers();
        setUsers(data);
      }
    } catch (e) {
      setError(e.response?.data?.error || `Failed to load ${t}.`);
    } finally { setLoading(false); }
  }

  async function handleWorkflowClick(wf) {
    setSelectedWorkflow(wf);
    setStepsLoading(true);
    try {
      const steps = await fetchWorkflowSteps(wf.id);
      setWorkflowSteps(steps);
    } catch (err) {
      console.error('Failed to fetch workflow steps:', err);
      setWorkflowSteps([]);
    } finally {
      setStepsLoading(false);
    }
  }

  const summary = metrics?.summary || {};

  return (
    <DashboardLayout 
      title="Admin"
      personaClass="admin"
      tabs={TABS}
      activeTab={tab}
      onTabChange={loadTab}
    >
      <div className="da-body">
        {error && <div className="da-alert error"><AlertTriangle size={16} /> {error}</div>}

        {loading && <LoadingSpinner text="Loading admin metrics…" size="md" />}

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && !loading && metrics && (
          <>
            {/* System Summary */}
            <div className="da-section">
              <div className="da-section-title" style={{ marginBottom: '1rem' }}>System Overview</div>
              <div className="da-stats-grid">
                <div className="da-stat-card"><div className="da-stat-label">Total Stories</div><div className="da-stat-value purple">{summary.total_stories ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">Done</div><div className="da-stat-value green">{summary.stories_done ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">In Progress</div><div className="da-stat-value blue">{summary.stories_in_progress ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">QA Testing</div><div className="da-stat-value yellow">{summary.stories_qa_testing ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">Invalid</div><div className="da-stat-value red">{summary.stories_invalid ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">Total Workflows</div><div className="da-stat-value">{summary.total_workflows ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">Active</div><div className="da-stat-value orange">{summary.active_workflows ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">Failed</div><div className="da-stat-value red">{summary.failed_workflows ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">PRs Merged</div><div className="da-stat-value green">{summary.merged_prs ?? 0}</div></div>
                <div className="da-stat-card"><div className="da-stat-label">PRs Rejected</div><div className="da-stat-value red">{summary.rejected_prs ?? 0}</div></div>
              </div>
            </div>
            
            {/* DevMetrics (Agent performance) */}
            <div className="da-section" style={{ marginTop: '2rem' }}>
              <div className="da-section-title" style={{ marginBottom: '1rem' }}>Agent Performance & Guardrails</div>
              <div className="da-table-wrap">
                <table className="da-table">
                  <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                  <tbody>
                    {Object.entries(metrics?.metrics || {}).map(([key, val]) => {
                      let displayVal = val;
                      if (val && typeof val === 'object' && val.avg_value !== undefined) {
                        displayVal = val.avg_value;
                      }
                      return (
                        <tr key={key}>
                          <td>{METRIC_LABELS[key] || key}</td>
                          <td>
                            <strong>
                              {typeof displayVal === 'number' 
                                ? (displayVal % 1 !== 0 ? displayVal.toFixed(2) : displayVal) 
                                : String(displayVal)}
                            </strong>
                            {val && typeof val === 'object' && val.sample_count !== undefined && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--da-muted)' }}>
                                ({val.sample_count} samples)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── WORKFLOWS ── */}
        {tab === 'workflows' && !loading && (
          <div className="da-section">
            <div className="da-section-title" style={{ marginBottom: '1rem' }}>All Workflows</div>
            <div className="da-table-wrap">
              <table className="da-table">
                <thead><tr><th>ID</th><th>Story ID</th><th>Status</th><th>Current Agent</th><th>Steps</th><th>Created</th></tr></thead>
                <tbody>
                  {workflows.map(wf => (
                    <tr 
                      key={wf.id} 
                      onClick={() => handleWorkflowClick(wf)} 
                      style={{ cursor: 'pointer' }}
                      title="Click to view step-by-step agent execution log"
                    >
                      <td><strong>#{wf.id}</strong></td>
                      <td>{wf.story_id ? `Story #${wf.story_id}` : 'General'}</td>
                      <td><span className={`da-badge ${wf.status === 'Completed' || wf.status === 'completed' ? 'green' : wf.status === 'Failed' || wf.status === 'failed' ? 'red' : 'blue'}`}>{wf.status}</span></td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--da-text)' }}>{wf.current_agent || '-'}</span></td>
                      <td><span className="da-badge default">{wf.step_count || 0} steps</span></td>
                      <td style={{ color: 'var(--da-muted)' }}>{wf.created_at ? new Date(wf.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Workflow Step Logs Modal */}
            {selectedWorkflow && (
              <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1.5rem'
              }}>
                <div style={{
                  background: 'var(--da-surface)',
                  border: '1px solid var(--da-border)',
                  borderRadius: 'var(--da-radius)',
                  width: '100%',
                  maxWidth: '850px',
                  maxHeight: '85vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                }}>
                  {/* Modal Header */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--da-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--da-surface-2)'
                  }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--da-text)' }}>
                        Workflow #{selectedWorkflow.id}: Step Execution Trace
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--da-muted)' }}>
                        Story ID: {selectedWorkflow.story_id || 'N/A'} | Status: {selectedWorkflow.status}
                      </span>
                    </div>
                    <button 
                      className="da-btn da-btn-ghost" 
                      onClick={() => { setSelectedWorkflow(null); setWorkflowSteps([]); }}
                      style={{ padding: '4px' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
                    {stepsLoading ? (
                      <LoadingSpinner text="Fetching workflow step logs..." size="sm" />
                    ) : workflowSteps.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--da-muted)' }}>
                        No step execution logs recorded for Workflow #{selectedWorkflow.id}.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {workflowSteps.map((s, idx) => (
                          <div 
                            key={s.id || idx}
                            style={{
                              background: 'var(--da-surface-2)',
                              border: '1px solid var(--da-border)',
                              borderRadius: 'var(--da-radius-sm)',
                              padding: '1rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--da-accent)' }}>
                                  Step {idx + 1}: {s.step_type} Agent
                                </span>
                                <span className={`da-badge ${s.status === 'Completed' ? 'green' : s.status === 'Failed' ? 'red' : 'blue'}`}>
                                  {s.status}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--da-muted)' }}>
                                {s.token_count ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Cpu size={12} /> {s.token_count} tokens
                                  </span>
                                ) : null}
                                {s.cost_usd ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Coins size={12} /> ${s.cost_usd}
                                  </span>
                                ) : null}
                                {s.created_at && <span>{new Date(s.created_at).toLocaleString()}</span>}
                              </div>
                            </div>

                            {/* Agent Prompt */}
                            {s.agent_prompt && (
                              <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--da-muted)', textTransform: 'uppercase' }}>Prompt</span>
                                <pre style={{
                                  background: 'var(--da-bg)',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem',
                                  color: 'var(--da-text)',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '120px',
                                  overflowY: 'auto',
                                  margin: '2px 0 0'
                                }}>
                                  {s.agent_prompt}
                                </pre>
                              </div>
                            )}

                            {/* Agent Output / Response */}
                            {s.agent_response && (
                              <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--da-muted)', textTransform: 'uppercase' }}>Output</span>
                                <pre style={{
                                  background: 'var(--da-bg)',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem',
                                  color: 'var(--da-text)',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  margin: '2px 0 0'
                                }}>
                                  {s.agent_response}
                                </pre>
                              </div>
                            )}

                            {/* Guardrail Triggered Indicator */}
                            {s.guardrail_triggered && (
                              <div className="da-alert warning" style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
                                <AlertTriangle size={12} /> <strong>Guardrail Intercepted:</strong> {s.guardrail_reason || 'Policy rule triggered'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GUARDRAILS ── */}
        {tab === 'guardrails' && !loading && (
          <div className="da-section">
            <div className="da-section-title" style={{ marginBottom: '1rem' }}>Guardrail Violations</div>
            <div className="da-table-wrap">
              <table className="da-table">
                <thead><tr><th>Time</th><th>Rule</th><th>Action Blocked</th><th>Severity</th></tr></thead>
                <tbody>
                  {guardrailEvents.map(e => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--da-muted)', fontSize: '0.85rem' }}>{new Date(e.created_at).toLocaleString()}</td>
                      <td><strong>{e.rule_name}</strong></td>
                      <td>{e.action_blocked}</td>
                      <td><span className={`da-badge ${e.severity === 'high' ? 'red' : e.severity === 'medium' ? 'yellow' : 'default'}`}>{e.severity}</span></td>
                    </tr>
                  ))}
                  {guardrailEvents.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--da-muted)' }}>No guardrail events logged.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab === 'audit' && !loading && (
          <div className="da-section">
            <div className="da-section-title" style={{ marginBottom: '1rem' }}>Audit Trail</div>
            <div className="da-table-wrap">
              <table className="da-table">
                <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Target</th></tr></thead>
                <tbody>
                  {auditLogs.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--da-muted)', fontSize: '0.85rem' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'medium' }) : ''}
                      </td>
                      <td><strong>{a.action}</strong></td>
                      <td>{a.user_id ? `User ${a.user_id}` : 'System'}</td>
                      <td><code style={{ fontSize: '0.8rem' }}>{a.target_type}:{a.target_id}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && !loading && (
          <div className="da-section">
            <div className="da-section-title" style={{ marginBottom: '1rem' }}>User Management</div>
            <div className="da-table-wrap">
              <table className="da-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className={`da-badge default`}>{u.role}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
