import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchQAQueue, submitQADecision } from '../../services/api';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import '../../styles/dashboard.css';

const TABS = [
  { id: 'queue', label: '🔍 QA Queue' }
];

export default function QADashboard() {
  const { user, logout } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selected, setSelected] = useState(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('queue');

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    try {
      setLoading(true); setError(null);
      const data = await fetchQAQueue();
      setQueue(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load QA queue.');
    } finally { setLoading(false); }
  }

  async function handleApprove(story) {
    if (!window.confirm(`Approve and merge PR for story: "${story.title}"?\n\nThis action is irreversible — the story will be marked DONE.`)) return;
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      await submitQADecision(story.id, 'approved', '');
      setSuccess(`✅ "${story.title}" approved and merged. Story marked DONE.`);
      setSelected(null);
      loadQueue();
    } catch (e) {
      setError(e.response?.data?.error || 'Approval failed.');
    } finally { setSubmitting(false); }
  }

  async function handleRejectSubmit(story) {
    if (!rejectComment.trim()) { setError('Please enter rejection comments to help the team rework.'); return; }
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      await submitQADecision(story.id, 'rejected', rejectComment);
      setSuccess(`🔁 "${story.title}" rejected. Story returned to TO-DO for rework.`);
      setRejectModal(false); setRejectComment(''); setSelected(null);
      loadQueue();
    } catch (e) {
      setError(e.response?.data?.error || 'Rejection failed.');
    } finally { setSubmitting(false); }
  }

  return (
    <DashboardLayout 
      title="QA Reviewer"
      personaClass="qa"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      <div className="da-body">
        {error && <div className="da-alert error">⚠ {error}</div>}
        {success && <div className="da-alert success">{success}</div>}

        {/* Stats */}
        <div className="da-stats-grid">
          <div className="da-stat-card"><div className="da-stat-label">Awaiting Review</div><div className="da-stat-value yellow">{queue.length}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">PRs Ready</div><div className="da-stat-value green">{queue.filter(s => s.pr).length}</div></div>
        </div>

        {tab === 'queue' && (
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 440px' : '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Queue */}
            <div className="da-section">
              <div className="da-section-header">
                <span className="da-section-title">🔍 QA Review Queue</span>
                <button className="da-btn da-btn-ghost" onClick={loadQueue}>↻ Refresh</button>
              </div>

              {loading ? (
                <div className="da-loading"><div className="da-spinner" /> Loading queue…</div>
              ) : queue.length === 0 ? (
                <div className="da-empty">
                  <div className="da-empty-icon">✅</div>
                  <h3>Queue is clear!</h3>
                  <p>No stories are awaiting QA review.</p>
                </div>
              ) : (
                <div className="da-table-wrap">
                  <table className="da-table">
                    <thead><tr><th>Story</th><th>Branch</th><th>PR</th><th>Iteration</th><th>Actions</th></tr></thead>
                    <tbody>
                      {queue.map(story => (
                        <tr key={story.id} onClick={() => setSelected(story)} style={{ cursor: 'pointer', background: selected?.id === story.id ? 'var(--da-bg-elevated)' : '' }}>
                          <td style={{ maxWidth: 200 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{story.title}</div>
                          </td>
                          <td><code style={{ fontSize: '0.75rem', color: 'var(--da-muted)' }}>{story.current_branch}</code></td>
                          <td>
                            {story.pr ? (
                              <a href={story.pr.pr_url} target="_blank" rel="noreferrer" style={{ color: 'var(--da-primary)', fontSize: '0.8rem', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                                View PR ↗
                              </a>
                            ) : '-'}
                          </td>
                          <td><span className="da-badge default">Loop {story.loop_iterations || 1}/3</span></td>
                          <td>
                            <button className="da-btn da-btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setSelected(story); }}>
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* QA Detail Panel */}
            {selected && (
              <div className="da-section" style={{ position: 'sticky', top: '1.5rem', alignSelf: 'start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div className="da-section-title">Review Story</div>
                  <button className="da-btn da-btn-ghost" onClick={() => setSelected(null)}>✕</button>
                </div>
                
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{selected.title}</h3>
                
                <div className="da-form-group">
                  <label>Acceptance Criteria</label>
                  <div style={{ background: 'var(--da-bg-base)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: '#e8eaf6', whiteSpace: 'pre-wrap' }}>
                    {selected.acceptance_criteria}
                  </div>
                </div>

                {selected.pr ? (
                  <div className="da-alert info" style={{ marginBottom: '1.5rem' }}>
                    <strong>PR is ready for review:</strong><br />
                    <a href={selected.pr.pr_url} target="_blank" rel="noreferrer" style={{ color: 'var(--da-primary)' }}>{selected.pr.pr_url}</a>
                  </div>
                ) : (
                  <div className="da-alert warning" style={{ marginBottom: '1.5rem' }}>
                    <strong>No active PR found.</strong> Developer agent might still be running or PR creation failed.
                  </div>
                )}

                {rejectModal ? (
                  <div style={{ background: 'var(--da-bg-base)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--da-border)' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--da-muted)', marginBottom: '0.5rem', display: 'block' }}>Reason for rejection (sent back to AI agent):</label>
                    <textarea 
                      value={rejectComment} 
                      onChange={e => setRejectComment(e.target.value)} 
                      rows={4} 
                      style={{ width: '100%', marginBottom: '1rem', background: 'var(--da-bg)', border: '1px solid var(--da-border)', color: '#fff', padding: '0.5rem' }} 
                      placeholder="e.g., The login button is missing on mobile..."
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="da-btn da-btn-ghost" onClick={() => setRejectModal(false)} disabled={submitting}>Cancel</button>
                      <button className="da-btn da-btn-danger" onClick={() => handleRejectSubmit(selected)} disabled={submitting}>Confirm Reject</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button className="da-btn da-btn-danger" style={{ flex: 1 }} onClick={() => setRejectModal(true)} disabled={submitting}>
                      ❌ Reject (Rework)
                    </button>
                    <button className="da-btn da-btn-primary" style={{ flex: 1, background: 'var(--da-success)', borderColor: 'var(--da-success)', color: '#fff' }} onClick={() => handleApprove(selected)} disabled={submitting || !selected.pr}>
                      ✅ Approve & Merge
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
