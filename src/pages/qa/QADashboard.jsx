import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchQAQueue, submitQADecision } from '../../services/api';
import '../../styles/dashboard.css';

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
    <div className="da-page">
      <header className="da-header">
        <div className="da-header-left">
          <span className="da-logo">DEVAA</span>
          <span className="da-persona-badge qa">QA Reviewer</span>
        </div>
        <div className="da-header-right">
          <span className="da-user-info">👤 {user?.name}</span>
          <button className="da-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <div className="da-body">
        {error && <div className="da-alert error">⚠ {error}</div>}
        {success && <div className="da-alert success">{success}</div>}

        {/* Stats */}
        <div className="da-stats-grid">
          <div className="da-stat-card"><div className="da-stat-label">Awaiting Review</div><div className="da-stat-value yellow">{queue.length}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">PRs Ready</div><div className="da-stat-value green">{queue.filter(s => s.pr).length}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 440px' : '1fr', gap: '1.5rem' }}>
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
                      <tr key={story.id} onClick={() => setSelected(story)}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{story.title}</div>
                          {story.jira_story_key && <code style={{ fontSize: '0.72rem', color: 'var(--da-info)' }}>{story.jira_story_key}</code>}
                        </td>
                        <td><code style={{ fontSize: '0.75rem', color: 'var(--da-muted)' }}>{story.pr?.branch_name || story.source_branch || '—'}</code></td>
                        <td>
                          {story.pr?.pr_url && !story.pr.pr_url.startsWith('#') ? (
                            <a href={story.pr.pr_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--da-info)', fontSize: '0.82rem' }}>View PR ↗</a>
                          ) : <span className="da-badge open">Simulated</span>}
                        </td>
                        <td style={{ color: 'var(--da-muted)', fontSize: '0.82rem' }}>Loop {story.workflow?.loop_iteration || 1}</td>
                        <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="da-btn da-btn-success"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                            disabled={submitting}
                            onClick={() => handleApprove(story)}
                          >✅ Approve</button>
                          <button
                            className="da-btn da-btn-danger"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                            disabled={submitting}
                            onClick={() => { setSelected(story); setRejectModal(true); }}
                          >❌ Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Story Detail Panel */}
          {selected && !rejectModal && (
            <div className="da-section">
              <div className="da-section-header">
                <span className="da-section-title">Story Details</span>
                <button className="da-btn da-btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div style={{ background: 'var(--da-surface)', border: '1px solid var(--da-border)', borderRadius: 'var(--da-radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--da-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Title</div>
                  <div style={{ fontWeight: 600 }}>{selected.title}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--da-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Acceptance Criteria</div>
                  <pre style={{ fontSize: '0.8rem', color: 'var(--da-text)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'var(--da-surface-2)', padding: '0.75rem', borderRadius: 'var(--da-radius-sm)', margin: 0 }}>
                    {selected.acceptance_criteria || 'Not specified'}
                  </pre>
                </div>
                {selected.pr && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--da-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Changed Files</div>
                    {(selected.pr.changed_files || []).map((f, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', fontFamily: 'monospace', padding: '0.25rem 0', borderBottom: '1px solid var(--da-border)' }}>📄 {f}</div>
                    ))}
                    {!selected.pr.changed_files?.length && <span style={{ color: 'var(--da-muted)', fontSize: '0.82rem' }}>No files</span>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <button className="da-btn da-btn-success" disabled={submitting} onClick={() => handleApprove(selected)}>✅ Approve & Merge</button>
                  <button className="da-btn da-btn-danger" disabled={submitting} onClick={() => setRejectModal(true)}>❌ Reject</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && selected && (
        <div className="da-modal-overlay" onClick={() => setRejectModal(false)}>
          <div className="da-modal" onClick={e => e.stopPropagation()}>
            <div className="da-modal-title">❌ Reject PR — {selected.title}</div>
            <div className="da-alert info" style={{ marginBottom: '1rem' }}>
              Your comments will be sent directly to the Developer Agent for the next rework cycle.
            </div>
            <div className="da-field">
              <label>Rejection Reason *</label>
              <textarea
                rows={6}
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                placeholder="Describe exactly what is wrong and what needs to be fixed. Be specific — the agent will use this to improve the implementation."
                autoFocus
              />
            </div>
            {error && <div className="da-alert error" style={{ marginTop: '0.75rem' }}>⚠ {error}</div>}
            <div className="da-modal-actions">
              <button className="da-btn da-btn-ghost" onClick={() => { setRejectModal(false); setRejectComment(''); }}>Cancel</button>
              <button className="da-btn da-btn-danger" disabled={submitting || !rejectComment.trim()} onClick={() => handleRejectSubmit(selected)}>
                {submitting ? 'Submitting…' : '❌ Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
