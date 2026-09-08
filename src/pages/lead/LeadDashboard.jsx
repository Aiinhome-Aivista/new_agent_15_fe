import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPullRequests, fetchPullRequest, fetchAuditLogs } from '../../services/api';
import '../../styles/dashboard.css';

const PR_STATUS_CLASS = { open: 'open', merged: 'merged', rejected: 'rejected', closed: 'todo' };

export default function LeadDashboard() {
  const { user, logout } = useAuth();
  const [prs, setPRs] = useState([]);
  const [selectedPR, setSelectedPR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tab, setTab] = useState('prs'); // 'prs' | 'audit'
  const [error, setError] = useState(null);

  useEffect(() => { loadPRs(); }, []);

  async function loadPRs() {
    try {
      setLoading(true); setError(null);
      const data = await fetchPullRequests();
      setPRs(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load pull requests.');
    } finally { setLoading(false); }
  }

  async function loadAuditLogs() {
    try {
      const data = await fetchAuditLogs({ limit: 50 });
      setAuditLogs(data);
    } catch (e) { setError('Failed to load audit logs.'); }
  }

  async function openPR(pr) {
    setDetailLoading(true);
    try {
      const detail = await fetchPullRequest(pr.id);
      setSelectedPR(detail);
    } catch { setSelectedPR(pr); }
    setDetailLoading(false);
  }

  function handleTabChange(t) {
    setTab(t);
    if (t === 'audit' && auditLogs.length === 0) loadAuditLogs();
    if (t === 'prs') setSelectedPR(null);
  }

  const openCount = prs.filter(p => p.pr_status === 'open').length;
  const mergedCount = prs.filter(p => p.pr_status === 'merged').length;

  return (
    <div className="da-page">
      <header className="da-header">
        <div className="da-header-left">
          <span className="da-logo">DEVAA</span>
          <span className="da-persona-badge lead">Engineering Lead</span>
        </div>
        <div className="da-header-right">
          <span className="da-user-info">👤 {user?.name}</span>
          <button className="da-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <div className="da-body">
        {error && <div className="da-alert error">⚠ {error}</div>}

        <div className="da-stats-grid">
          <div className="da-stat-card"><div className="da-stat-label">Total PRs</div><div className="da-stat-value blue">{prs.length}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">Open</div><div className="da-stat-value yellow">{openCount}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">Merged</div><div className="da-stat-value green">{mergedCount}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">Rejected</div><div className="da-stat-value red">{prs.filter(p=>p.pr_status==='rejected').length}</div></div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {['prs', 'audit'].map(t => (
            <button key={t} className={`da-btn ${tab === t ? 'da-btn-primary' : 'da-btn-ghost'}`} onClick={() => handleTabChange(t)}>
              {t === 'prs' ? '🔀 Pull Requests' : '📋 Audit Logs'}
            </button>
          ))}
        </div>

        {tab === 'prs' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedPR ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
            {/* PR List */}
            <div className="da-section">
              {loading ? (
                <div className="da-loading"><div className="da-spinner" /> Loading PRs…</div>
              ) : prs.length === 0 ? (
                <div className="da-empty"><div className="da-empty-icon">🔀</div><h3>No pull requests yet</h3><p>PRs appear here after the DEVAA pipeline runs.</p></div>
              ) : (
                <div className="da-table-wrap">
                  <table className="da-table">
                    <thead><tr><th>PR / Branch</th><th>Story</th><th>Status</th><th>Files</th><th>Created</th></tr></thead>
                    <tbody>
                      {prs.map(pr => (
                        <tr key={pr.id} onClick={() => openPR(pr)}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>PR #{pr.pr_number || pr.id}</div>
                            <code style={{ fontSize: '0.72rem', color: 'var(--da-muted)' }}>{pr.branch_name}</code>
                          </td>
                          <td style={{ color: 'var(--da-muted)', fontSize: '0.82rem' }}>#{pr.story_id || '—'}</td>
                          <td><span className={`da-badge ${PR_STATUS_CLASS[pr.pr_status]}`}>{pr.pr_status}</span></td>
                          <td style={{ color: 'var(--da-muted)', fontSize: '0.82rem' }}>{pr.changed_files?.length || 0} files</td>
                          <td style={{ color: 'var(--da-muted)', fontSize: '0.78rem' }}>{pr.created_at ? new Date(pr.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PR Detail */}
            {selectedPR && (
              <div className="da-section">
                <div className="da-section-header">
                  <span className="da-section-title">PR Detail</span>
                  <button className="da-btn da-btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => setSelectedPR(null)}>✕</button>
                </div>
                {detailLoading ? (
                  <div className="da-loading"><div className="da-spinner" /></div>
                ) : (
                  <div style={{ background: 'var(--da-surface)', border: '1px solid var(--da-border)', borderRadius: 'var(--da-radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* PR URL */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--da-muted)', marginBottom: 4 }}>PR URL</div>
                      {selectedPR.pr_url && !selectedPR.pr_url.startsWith('#') ? (
                        <a href={selectedPR.pr_url} target="_blank" rel="noreferrer" style={{ color: 'var(--da-info)', fontSize: '0.85rem' }}>{selectedPR.pr_url}</a>
                      ) : <span style={{ color: 'var(--da-muted)', fontSize: '0.82rem' }}>Simulated (no GitHub token)</span>}
                    </div>

                    {/* Changed Files */}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--da-muted)', marginBottom: 8 }}>Changed Files ({selectedPR.changed_files?.length || 0})</div>
                      {(selectedPR.changed_files || []).map((f, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--da-text)', padding: '0.3rem 0', borderBottom: '1px solid var(--da-border)' }}>📄 {f}</div>
                      ))}
                      {!selectedPR.changed_files?.length && <span style={{ color: 'var(--da-muted)', fontSize: '0.82rem' }}>No files listed</span>}
                    </div>

                    {/* Agent Steps Timeline */}
                    {selectedPR.steps?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--da-muted)', marginBottom: 8 }}>Agent Execution</div>
                        <div className="da-timeline">
                          {selectedPR.steps.map(s => (
                            <div className="da-timeline-item" key={s.id}>
                              <div className={`da-timeline-dot ${s.status?.toLowerCase()}`} />
                              <div className="da-timeline-content">
                                <div className="da-timeline-label" style={{ fontSize: '0.8rem' }}>{s.type}</div>
                                <div className="da-timeline-meta">
                                  <span className={`da-badge ${s.status?.toLowerCase()}`}>{s.status}</span>
                                  {s.token_count > 0 && <span style={{ marginLeft: 6 }}>🪙 {s.token_count}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* QA Reviews */}
                    {selectedPR.qa_reviews?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--da-muted)', marginBottom: 8 }}>QA Reviews</div>
                        {selectedPR.qa_reviews.map((r, i) => (
                          <div key={i} style={{ padding: '0.65rem', background: 'var(--da-surface-2)', borderRadius: 'var(--da-radius-sm)', marginBottom: 8 }}>
                            <span className={`da-badge ${r.decision}`}>{r.decision}</span>
                            {r.comments && <p style={{ fontSize: '0.8rem', color: 'var(--da-muted)', marginTop: 6 }}>{r.comments}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'audit' && (
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
                    <td style={{ fontSize: '0.75rem', color: 'var(--da-muted)', maxWidth: 200 }}>{JSON.stringify(log.event_data)?.substring(0, 60)}…</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--da-muted)' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
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
