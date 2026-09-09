import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPullRequests, fetchPullRequest, fetchAuditLogs } from '../../services/api';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import '../../styles/dashboard.css';

const PR_STATUS_CLASS = { open: 'open', merged: 'merged', rejected: 'rejected', closed: 'todo' };

const TABS = [
  { id: 'prs', label: '🔀 Pull Requests' },
  { id: 'audit', label: '📋 Audit Logs' }
];

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
    <DashboardLayout 
      title="Engineering Lead"
      personaClass="lead"
      tabs={TABS}
      activeTab={tab}
      onTabChange={handleTabChange}
    >
      <div className="da-body">
        {error && <div className="da-alert error">⚠ {error}</div>}

        <div className="da-stats-grid">
          <div className="da-stat-card"><div className="da-stat-label">Total PRs</div><div className="da-stat-value blue">{prs.length}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">Open</div><div className="da-stat-value yellow">{openCount}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">Merged</div><div className="da-stat-value green">{mergedCount}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">Rejected</div><div className="da-stat-value red">{prs.filter(p=>p.pr_status==='rejected').length}</div></div>
        </div>

        {tab === 'prs' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedPR ? '1fr 400px' : '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
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
                        <tr key={pr.id} onClick={() => openPR(pr)} style={{ cursor: 'pointer', background: selectedPR?.id === pr.id ? 'var(--da-bg-elevated)' : '' }}>
                          <td>
                            <strong>{pr.pr_title || pr.branch_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--da-muted)' }}>{pr.branch_name}</div>
                          </td>
                          <td>{pr.story_id}</td>
                          <td><span className={`da-badge ${PR_STATUS_CLASS[pr.pr_status]}`}>{pr.pr_status}</span></td>
                          <td>{pr.files_changed}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--da-muted)' }}>{new Date(pr.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PR Detail Panel */}
            {selectedPR && (
              <div className="da-section" style={{ position: 'sticky', top: '1.5rem', alignSelf: 'start', maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div className="da-section-title">PR Details</div>
                  <button className="da-btn da-btn-ghost" onClick={() => setSelectedPR(null)}>✕</button>
                </div>

                {detailLoading ? (
                  <div className="da-loading"><div className="da-spinner" /> Loading…</div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{selectedPR.pr_title || selectedPR.branch_name}</h3>
                    <div style={{ marginBottom: '1.5rem' }}><span className={`da-badge ${PR_STATUS_CLASS[selectedPR.pr_status]}`}>{selectedPR.pr_status}</span></div>

                    <div className="da-form-group">
                      <label>Description</label>
                      <div style={{ background: 'var(--da-bg-base)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: '#e8eaf6', whiteSpace: 'pre-wrap' }}>
                        {selectedPR.pr_body || 'No description provided.'}
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                      {selectedPR.pr_url && (
                        <a href={selectedPR.pr_url} target="_blank" rel="noreferrer" className="da-btn da-btn-outline" style={{ flex: 1, textAlign: 'center' }}>
                          View on GitHub ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="da-section" style={{ marginTop: '1.5rem' }}>
            <div className="da-section-title" style={{ marginBottom: '1rem' }}>Lead Audit Log</div>
            <div className="da-table-wrap">
              <table className="da-table">
                <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Target</th></tr></thead>
                <tbody>
                  {auditLogs.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--da-muted)', fontSize: '0.85rem' }}>{new Date(a.created_at).toLocaleString()}</td>
                      <td><strong>{a.action}</strong></td>
                      <td>{a.user_id ? `User ${a.user_id}` : 'System'}</td>
                      <td><code style={{ fontSize: '0.8rem' }}>{a.target_type}:{a.target_id}</code></td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No logs yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
