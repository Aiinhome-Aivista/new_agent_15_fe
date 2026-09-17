import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPullRequests, fetchPullRequest, fetchAuditLogs, downloadPREvidenceBlob } from '../../services/api';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import PRConversationSection from '../../components/PRConversationSection';
import LoadingSpinner from '../../components/LoadingSpinner';
import { GitPullRequest, ClipboardList, AlertTriangle, X, Download, FileText, RefreshCw, ExternalLink } from 'lucide-react';
import '../../styles/dashboard.css';

const PR_STATUS_CLASS = { open: 'open', merged: 'merged', rejected: 'rejected', closed: 'todo' };

const TABS = [
  { id: 'prs', label: <><GitPullRequest size={16} /> Pull Requests</> },
  { id: 'audit', label: <><ClipboardList size={16} /> Audit Logs</> }
];

export default function LeadDashboard() {
  const { user, logout } = useAuth();
  const [prs, setPRs] = useState([]);
  const [selectedPR, setSelectedPR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadingEvidence, setDownloadingEvidence] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tab, setTab] = useState('prs'); // 'prs' | 'audit'
  const [error, setError] = useState(null);

  async function handleDownloadEvidence(prId) {
    if (!prId) return;
    setDownloadingEvidence(true);
    try {
      const res = await downloadPREvidenceBlob(prId);
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence_pr_${prId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download PR evidence:', err);
      alert('Failed to download evidence: ' + (err.message || 'Error'));
    } finally {
      setDownloadingEvidence(false);
    }
  }


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
        {error && <div className="da-alert error"><AlertTriangle size={16} /> {error}</div>}

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
                <LoadingSpinner text="Loading PRs…" size="md" />
              ) : prs.length === 0 ? (
                <div className="da-empty"><div className="da-empty-icon"><GitPullRequest size={48} /></div><h3>No pull requests yet</h3><p>PRs appear here after the DEVAA pipeline runs.</p></div>
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

            {/* PR Detail Modal Popup */}
            {selectedPR && (
              <div 
                style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0, 0, 0, 0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  padding: '1.5rem'
                }}
                onClick={() => setSelectedPR(null)}
              >
                <div 
                  style={{
                    background: 'var(--da-surface)',
                    border: '1px solid var(--da-border)',
                    borderRadius: 'var(--da-radius)',
                    width: '100%',
                    maxWidth: '850px',
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--da-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--da-surface-2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--da-text)' }}>
                        {selectedPR.pr_title || selectedPR.branch_name}
                      </h3>
                      <span className={`da-badge ${PR_STATUS_CLASS[selectedPR.pr_status]}`}>{selectedPR.pr_status}</span>
                    </div>
                    <button className="da-btn da-btn-ghost" onClick={() => setSelectedPR(null)} style={{ padding: '4px' }}>
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
                    {detailLoading ? (
                      <LoadingSpinner text="Loading PR details…" size="md" />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="da-form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--da-muted)', marginBottom: '6px', display: 'block' }}>
                            PR Description
                          </label>
                          <div style={{ 
                            background: 'var(--da-surface-2, #FFF7F2)', 
                            padding: '0.85rem', 
                            borderRadius: 'var(--da-radius-sm)', 
                            border: '1px solid var(--da-border)', 
                            fontSize: '0.85rem', 
                            color: 'var(--da-text)', 
                            whiteSpace: 'pre-wrap', 
                            maxHeight: '220px', 
                            overflowY: 'auto' 
                          }}>
                            {selectedPR.pr_body || 'No description provided.'}
                          </div>
                        </div>

                        {/* Live GitHub PR Conversation & Reviews Timeline */}
                        <PRConversationSection
                          prId={selectedPR.id}
                          prNumber={selectedPR.pr_number}
                          prUrl={selectedPR.pr_url}
                          cachedSummary={selectedPR.pr_summary}
                        />

                        {/* Modal Action Footer */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                          {selectedPR.pr_url && (
                            <a 
                              href={selectedPR.pr_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="da-btn da-btn-outline" 
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, fontSize: '0.82rem' }}
                            >
                              <ExternalLink size={14} /> View on GitHub
                            </a>
                          )}
                          <button
                            onClick={() => handleDownloadEvidence(selectedPR.id)}
                            disabled={downloadingEvidence}
                            className="da-btn da-btn-outline"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, fontSize: '0.82rem', color: 'var(--da-accent)', borderColor: 'var(--da-border-orange)', background: 'rgba(255,90,20,0.08)' }}
                            title="Download PR evidence report JSON"
                          >
                            {downloadingEvidence ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                            Download Evidence Report
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                      <td style={{ color: 'var(--da-muted)', fontSize: '0.85rem' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'medium' }) : ''}
                      </td>
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
