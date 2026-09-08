import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAdminMetrics, fetchAuditLogs, fetchGuardrailEvents, fetchAllWorkflows, fetchUsers } from '../../services/api';
import '../../styles/dashboard.css';

const TABS = ['overview', 'workflows', 'guardrails', 'audit', 'users'];
const TAB_LABELS = { overview: '📊 Overview', workflows: '⚙️ Workflows', guardrails: '🛡 Guardrails', audit: '📋 Audit', users: '👥 Users' };

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

  const summary = metrics?.summary || {};

  return (
    <div className="da-page">
      <header className="da-header">
        <div className="da-header-left">
          <span className="da-logo">DEVAA</span>
          <span className="da-persona-badge admin">Admin</span>
        </div>
        <div className="da-header-right">
          <span className="da-user-info">👤 {user?.name}</span>
          <button className="da-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <div className="da-body">
        {error && <div className="da-alert error">⚠ {error}</div>}

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t} className={`da-btn ${tab === t ? 'da-btn-primary' : 'da-btn-ghost'}`} onClick={() => loadTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {loading && <div className="da-loading"><div className="da-spinner" /> Loading…</div>}

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

            {/* Success Metrics */}
            <div className="da-section">
              <div className="da-section-title" style={{ marginBottom: '1rem' }}>📈 Success Metrics</div>
              {metrics.metrics?.length === 0 ? (
                <div className="da-empty"><div className="da-empty-icon">📈</div><h3>No metrics yet</h3><p>Run the pipeline to generate metrics data.</p></div>
              ) : (
                <div className="da-table-wrap">
                  <table className="da-table">
                    <thead><tr><th>Metric</th><th>Avg Value</th><th>Sample Count</th><th>Last Measured</th></tr></thead>
                    <tbody>
                      {(metrics.metrics || []).map(m => (
                        <tr key={m.metric_name}>
                          <td style={{ fontWeight: 500 }}>{METRIC_LABELS[m.metric_name] || m.metric_name}</td>
                          <td>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: m.avg_value >= 0.7 ? 'var(--da-success)' : m.avg_value >= 0.4 ? 'var(--da-warning)' : 'var(--da-danger)' }}>
                              {m.metric_name.includes('count') || m.metric_name.includes('iteration') ? m.avg_value?.toFixed(1) : `${((m.avg_value || 0) * 100).toFixed(0)}%`}
                            </span>
                          </td>
                          <td style={{ color: 'var(--da-muted)' }}>{m.sample_count}</td>
                          <td style={{ color: 'var(--da-muted)', fontSize: '0.8rem' }}>{m.last_measured ? new Date(m.last_measured).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── WORKFLOWS ── */}
        {tab === 'workflows' && !loading && (
          <div className="da-table-wrap">
            <table className="da-table">
              <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Current Agent</th><th>Loops</th><th>Steps</th><th>Created</th></tr></thead>
              <tbody>
                {workflows.length === 0 ? (
                  <tr><td colSpan={7}><div className="da-empty" style={{ padding: '2rem' }}><p>No workflows yet.</p></div></td></tr>
                ) : workflows.map(w => (
                  <tr key={w.id}>
                    <td><code style={{ color: 'var(--da-muted)', fontSize: '0.8rem' }}>#{w.id}</code></td>
                    <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</td>
                    <td><span className={`da-badge ${w.status?.toLowerCase().replace(' ', '') === 'awaitingqa' ? 'awaiting' : w.status?.toLowerCase()}`}>{w.status}</span></td>
                    <td style={{ color: 'var(--da-muted)', fontSize: '0.82rem' }}>{w.current_agent || '—'}</td>
                    <td style={{ color: 'var(--da-muted)' }}>{w.loop_iteration}</td>
                    <td style={{ color: 'var(--da-muted)' }}>{w.step_count}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--da-muted)' }}>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── GUARDRAILS ── */}
        {tab === 'guardrails' && !loading && (
          <div className="da-table-wrap">
            <table className="da-table">
              <thead><tr><th>Rail Type</th><th>Action Blocked</th><th>Reason</th><th>Workflow</th><th>Time</th></tr></thead>
              <tbody>
                {guardrailEvents.length === 0 ? (
                  <tr><td colSpan={5}><div className="da-empty" style={{ padding: '2rem' }}><div className="da-empty-icon">🛡</div><h3>No guardrail events</h3><p>All systems operating within guardrails.</p></div></td></tr>
                ) : guardrailEvents.map(e => (
                  <tr key={e.id}>
                    <td><span className="da-badge warning">{e.rail_type}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{e.action_blocked}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--da-muted)', maxWidth: 300 }}>{e.reason}</td>
                    <td style={{ color: 'var(--da-muted)' }}>#{e.workflow_id || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--da-muted)' }}>{e.triggered_at ? new Date(e.triggered_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab === 'audit' && !loading && (
          <div className="da-table-wrap">
            <table className="da-table">
              <thead><tr><th>Event</th><th>Workflow</th><th>Story</th><th>Data</th><th>Time</th></tr></thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={5}><div className="da-empty" style={{ padding: '2rem' }}><p>No audit logs yet.</p></div></td></tr>
                ) : auditLogs.map(log => (
                  <tr key={log.id}>
                    <td><code style={{ fontSize: '0.78rem', color: 'var(--da-info)' }}>{log.event_type}</code></td>
                    <td style={{ color: 'var(--da-muted)' }}>#{log.workflow_id || '—'}</td>
                    <td style={{ color: 'var(--da-muted)' }}>#{log.story_id || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--da-muted)', maxWidth: 220 }}>{JSON.stringify(log.event_data)?.substring(0, 80)}…</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--da-muted)' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && !loading && (
          <div className="da-table-wrap">
            <table className="da-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Joined</th></tr></thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5}><div className="da-empty" style={{ padding: '2rem' }}><p>No users found.</p></div></td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ color: 'var(--da-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                    <td>
                      <span className={`da-persona-badge ${u.role === 'Product Owner' ? 'po' : u.role === 'Engineering Lead' ? 'lead' : u.role === 'QA Reviewer' ? 'qa' : 'admin'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td><span className={`da-badge ${u.is_active ? 'done' : 'invalid'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--da-muted)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
