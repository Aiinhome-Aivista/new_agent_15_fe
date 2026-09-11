import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchQAQueue, fetchQAApproved, submitQADecision } from '../../services/api';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useDialog } from '../../contexts/DialogContext';
import PipelineLogsPanel from '../../components/PipelineLogsPanel';
import { 
  Search, RefreshCw, CheckCircle, CheckCircle2, AlertTriangle, 
  XCircle, Check, X, ExternalLink, Calendar, GitPullRequest, 
  GitBranch, Eye, Terminal, FileText, UserCheck, MessageSquare 
} from 'lucide-react';
import '../../styles/dashboard.css';

export default function QADashboard() {
  const { user } = useAuth();
  const { showConfirm } = useDialog();

  // Tab state
  const [tab, setTab] = useState('queue'); // 'queue' | 'approved'

  // Queue state
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selected, setSelected] = useState(null);

  // Approved stories state
  const [approvedList, setApprovedList] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [approvedSearch, setApprovedSearch] = useState('');
  const [selectedApproved, setSelectedApproved] = useState(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pipeline logs modal state
  const [logsPanelStory, setLogsPanelStory] = useState(null);

  useEffect(() => {
    loadQueue();
    loadApproved();
  }, []);

  async function loadQueue() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchQAQueue();
      setQueue(data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load QA queue.');
    } finally {
      setLoading(false);
    }
  }

  async function loadApproved() {
    try {
      setLoadingApproved(true);
      const data = await fetchQAApproved();
      setApprovedList(data || []);
    } catch (e) {
      console.error('Failed to load approved stories:', e);
    } finally {
      setLoadingApproved(false);
    }
  }

  async function handleApprove(story) {
    const confirmed = await showConfirm(
      `Approve and merge PR for story: "${story.title}"?\n\nThis action is irreversible — the story will be marked DONE.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await submitQADecision(story.id, 'approved', 'Approved by QA Reviewer');
      setSuccess(`"${story.title}" approved and merged. Story marked DONE.`);
      setSelected(null);
      loadQueue();
      loadApproved();
    } catch (e) {
      setError(e.response?.data?.error || 'Approval failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectSubmit(story) {
    if (!rejectComment.trim()) {
      setError('Please enter rejection comments to help the team rework.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await submitQADecision(story.id, 'rejected', rejectComment);
      setSuccess(`"${story.title}" rejected. Story returned to TO-DO for rework.`);
      setRejectModal(false);
      setRejectComment('');
      setSelected(null);
      loadQueue();
    } catch (e) {
      setError(e.response?.data?.error || 'Rejection failed.');
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered approved items based on search
  const filteredApproved = approvedList.filter(item => {
    if (!approvedSearch.trim()) return true;
    const q = approvedSearch.toLowerCase().trim();
    const storyTitle = (item.story?.title || item.title || '').toLowerCase();
    const storyKey = (item.story?.jira_story_key || item.jira_story_key || '').toLowerCase();
    const reviewerName = (item.reviewer?.name || item.reviewer?.email || '').toLowerCase();
    const branch = (item.pr?.branch_name || item.story?.source_branch || '').toLowerCase();
    const comments = (item.comments || '').toLowerCase();
    return (
      storyTitle.includes(q) ||
      storyKey.includes(q) ||
      reviewerName.includes(q) ||
      branch.includes(q) ||
      comments.includes(q)
    );
  });

  const tabs = [
    { 
      id: 'queue', 
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={16} /> QA Queue
          {queue.length > 0 && (
            <span 
              className="da-badge" 
              style={{ background: 'rgba(255, 90, 20, 0.15)', color: 'var(--da-accent)', padding: '1px 6px', fontSize: '0.7rem' }}
            >
              {queue.length}
            </span>
          )}
        </span>
      ) 
    },
    { 
      id: 'approved', 
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={16} color="var(--da-success)" /> Approved by QA
          {approvedList.length > 0 && (
            <span 
              className="da-badge" 
              style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--da-success)', padding: '1px 6px', fontSize: '0.7rem' }}
            >
              {approvedList.length}
            </span>
          )}
        </span>
      ) 
    }
  ];

  return (
    <DashboardLayout 
      title="QA Reviewer"
      personaClass="qa"
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
    >
      <div className="da-body">
        {error && <div className="da-alert error"><AlertTriangle size={16} /> {error}</div>}
        {success && <div className="da-alert success"><CheckCircle size={16} /> {success}</div>}

        {/* Stats Summary */}
        <div className="da-stats-grid">
          <div 
            className="da-stat-card" 
            onClick={() => setTab('queue')} 
            style={{ cursor: 'pointer', border: tab === 'queue' ? '1px solid var(--da-accent)' : undefined }}
            title="View Awaiting Review"
          >
            <div className="da-stat-label">Awaiting Review</div>
            <div className="da-stat-value yellow">{queue.length}</div>
          </div>
          <div className="da-stat-card">
            <div className="da-stat-label">PRs Ready for Review</div>
            <div className="da-stat-value green">{queue.filter(s => s.pr).length}</div>
          </div>
          <div 
            className="da-stat-card" 
            onClick={() => setTab('approved')} 
            style={{ cursor: 'pointer', border: tab === 'approved' ? '1px solid var(--da-success)' : undefined }}
            title="View Approved by QA"
          >
            <div className="da-stat-label">Approved by QA</div>
            <div className="da-stat-value green">{approvedList.length}</div>
          </div>
        </div>

        {/* ── TAB 1: QA QUEUE ── */}
        {tab === 'queue' && (
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 440px' : '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="da-section">
              <div className="da-section-header">
                <span className="da-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={20} /> QA Review Queue
                </span>
                <button className="da-btn da-btn-ghost" onClick={loadQueue}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="da-loading"><div className="da-spinner" /> Loading queue…</div>
              ) : queue.length === 0 ? (
                <div className="da-empty">
                  <div className="da-empty-icon"><CheckCircle size={48} /></div>
                  <h3>Queue is clear!</h3>
                  <p>No stories are awaiting QA review.</p>
                  {approvedList.length > 0 && (
                    <button 
                      className="da-btn da-btn-primary" 
                      style={{ marginTop: '1rem' }} 
                      onClick={() => setTab('approved')}
                    >
                      <CheckCircle2 size={16} /> View Approved Stories ({approvedList.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="da-table-wrap">
                  <table className="da-table">
                    <thead>
                      <tr>
                        <th>Story</th>
                        <th>Branch</th>
                        <th>PR</th>
                        <th>Iteration</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map(story => (
                        <tr 
                          key={story.id} 
                          onClick={() => setSelected(story)} 
                          style={{ cursor: 'pointer', background: selected?.id === story.id ? 'var(--da-bg-elevated)' : '' }}
                        >
                          <td style={{ maxWidth: 220 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{story.title}</div>
                            {story.jira_story_key && (
                              <span className="da-badge default" style={{ fontSize: '0.7rem', marginTop: '4px', display: 'inline-block' }}>
                                {story.jira_story_key}
                              </span>
                            )}
                          </td>
                          <td>
                            <code style={{ fontSize: '0.75rem', color: 'var(--da-muted)' }}>
                              {story.current_branch || story.source_branch || 'main'}
                            </code>
                          </td>
                          <td>
                            {story.pr ? (
                              <a 
                                href={story.pr.pr_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: 'var(--da-primary)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }} 
                                onClick={e => e.stopPropagation()}
                              >
                                View PR <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span style={{ color: 'var(--da-muted)', fontSize: '0.8rem' }}>-</span>
                            )}
                          </td>
                          <td><span className="da-badge default">Loop {story.loop_iterations || 1}/3</span></td>
                          <td>
                            <button 
                              className="da-btn da-btn-primary" 
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} 
                              onClick={(e) => { e.stopPropagation(); setSelected(story); }}
                            >
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

            {/* QA Detail Panel for Queue */}
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
                    {selected.acceptance_criteria || 'No acceptance criteria provided.'}
                  </div>
                </div>

                {selected.pr ? (
                  <div className="da-alert info" style={{ marginBottom: '1.5rem' }}>
                    <strong>PR is ready for review:</strong><br />
                    <a href={selected.pr.pr_url} target="_blank" rel="noreferrer" style={{ color: 'var(--da-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {selected.pr.pr_url} <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <div className="da-alert warning" style={{ marginBottom: '1.5rem' }}>
                    <strong>No active PR found.</strong> Developer agent might still be running or PR creation failed.
                  </div>
                )}

                {rejectModal ? (
                  <div style={{ background: 'var(--da-bg-base)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--da-border)' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--da-muted)', marginBottom: '0.5rem', display: 'block' }}>
                      Reason for rejection (sent back to AI agent):
                    </label>
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
                      <X size={16} /> Reject (Rework)
                    </button>
                    <button 
                      className="da-btn da-btn-primary" 
                      style={{ flex: 1, background: 'var(--da-success)', borderColor: 'var(--da-success)', color: '#fff' }} 
                      onClick={() => handleApprove(selected)} 
                      disabled={submitting || !selected.pr}
                    >
                      <Check size={16} /> Approve & Merge
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: APPROVED BY QA ── */}
        {tab === 'approved' && (
          <div className="da-section" style={{ marginTop: '1.5rem' }}>
            <div className="da-section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="da-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} color="var(--da-success)" /> Approved by QA
                </span>
                <span 
                  className="da-badge" 
                  style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--da-success)', fontWeight: 700 }}
                >
                  {filteredApproved.length} {filteredApproved.length === 1 ? 'story' : 'stories'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '480px', justifyContent: 'flex-end' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search 
                    size={15} 
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--da-muted)' }} 
                  />
                  <input
                    type="text"
                    className="da-input"
                    placeholder="Search approved stories, key, reviewer..."
                    value={approvedSearch}
                    onChange={e => setApprovedSearch(e.target.value)}
                    style={{ paddingLeft: '32px', height: '34px', fontSize: '0.82rem', width: '100%' }}
                  />
                  {approvedSearch && (
                    <button
                      onClick={() => setApprovedSearch('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--da-muted)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button className="da-btn da-btn-ghost" onClick={loadApproved} title="Refresh list" style={{ height: '34px' }}>
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {loadingApproved ? (
              <div className="da-loading"><div className="da-spinner" /> Loading approved stories…</div>
            ) : filteredApproved.length === 0 ? (
              <div className="da-empty">
                <div className="da-empty-icon"><CheckCircle2 size={48} color="var(--da-success)" /></div>
                <h3>{approvedSearch ? 'No matching approved stories' : 'No approved stories yet'}</h3>
                <p>
                  {approvedSearch 
                    ? `No stories matched "${approvedSearch}". Try a different search keyword.` 
                    : 'When QA reviewers approve and merge stories, they will be listed here with complete review history.'}
                </p>
                {approvedSearch && (
                  <button className="da-btn da-btn-ghost" onClick={() => setApprovedSearch('')} style={{ marginTop: '0.5rem' }}>
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="da-table-wrap">
                <table className="da-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '240px' }}>Story</th>
                      <th>Branch</th>
                      <th>Pull Request</th>
                      <th>Approved By</th>
                      <th>Approval Date</th>
                      <th>QA Feedback</th>
                      <th style={{ textAlign: 'right', minWidth: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApproved.map(item => {
                      const storyObj = item.story || {};
                      const prObj = item.pr || {};
                      const reviewerObj = item.reviewer || {};
                      const storyTitle = storyObj.title || item.title || `Story #${item.story_id}`;
                      const jiraKey = storyObj.jira_story_key || item.jira_story_key;
                      const branch = prObj.branch_name || storyObj.source_branch || storyObj.current_branch || 'main';
                      const isSelected = selectedApproved?.story_id === item.story_id || selectedApproved?.review_id === item.review_id;

                      return (
                        <tr 
                          key={item.review_id || item.story_id}
                          onClick={() => setSelectedApproved(item)}
                          style={{ 
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(34, 197, 94, 0.08)' : undefined,
                            transition: 'background 0.15s ease'
                          }}
                          title="Click to view full approval details"
                        >
                          {/* Story Info */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {jiraKey && (
                                  <span 
                                    className="da-badge" 
                                    style={{ 
                                      background: 'rgba(255, 90, 20, 0.1)', 
                                      color: 'var(--da-accent)', 
                                      border: '1px solid var(--da-border-orange)', 
                                      fontSize: '0.7rem',
                                      fontWeight: 700 
                                    }}
                                  >
                                    {jiraKey}
                                  </span>
                                )}
                                <span 
                                  className="da-badge" 
                                  style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--da-success)', fontSize: '0.68rem', fontWeight: 600 }}
                                >
                                  DONE
                                </span>
                              </div>
                              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1f2937' }}>
                                {storyTitle}
                              </span>
                            </div>
                          </td>

                          {/* Branch */}
                          <td>
                            <code style={{ 
                              fontSize: '0.75rem', 
                              background: 'var(--da-surface-2)', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              border: '1px solid var(--da-border)',
                              color: 'var(--da-accent)'
                            }}>
                              <GitBranch size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                              {branch}
                            </code>
                          </td>

                          {/* Pull Request */}
                          <td>
                            {prObj.pr_url ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <a 
                                  href={prObj.pr_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ 
                                    color: 'var(--da-accent)', 
                                    fontWeight: 600, 
                                    fontSize: '0.8rem', 
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <GitPullRequest size={13} />
                                  {prObj.pr_number ? `#${prObj.pr_number}` : 'PR'} <ExternalLink size={11} />
                                </a>
                                <span className="da-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--da-success)', fontSize: '0.65rem' }}>
                                  Merged
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--da-muted)', fontSize: '0.8rem' }}>Merged</span>
                            )}
                          </td>

                          {/* Reviewer */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: 'rgba(255, 90, 20, 0.15)', color: 'var(--da-accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 700
                              }}>
                                {(reviewerObj.name || 'QA')[0].toUpperCase()}
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#374151' }}>
                                {reviewerObj.name || reviewerObj.email || 'QA Reviewer'}
                              </span>
                            </div>
                          </td>

                          {/* Approval Date */}
                          <td>
                            <span style={{ fontSize: '0.78rem', color: 'var(--da-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} />
                              {item.approved_at 
                                ? new Date(item.approved_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                : 'Recently'}
                            </span>
                          </td>

                          {/* Comments */}
                          <td style={{ maxWidth: '180px' }}>
                            <span 
                              style={{ 
                                fontSize: '0.78rem', 
                                color: '#4b5563', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap', 
                                display: 'block' 
                              }}
                              title={item.comments || 'Approved'}
                            >
                              {item.comments || 'Approved and merged'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="da-btn da-btn-outline"
                              style={{ 
                                padding: '0.25rem 0.6rem', 
                                fontSize: '0.75rem', 
                                borderColor: 'var(--da-border-orange)', 
                                color: 'var(--da-accent)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApproved(item);
                              }}
                            >
                              <Eye size={13} /> View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MODAL: APPROVED STORY DETAILS ── */}
        {selectedApproved && (
          <div 
            className="da-modal-overlay" 
            onClick={() => setSelectedApproved(null)}
            style={{ zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          >
            <div 
              className="da-modal-content" 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: 'var(--da-radius)',
                maxWidth: '780px',
                width: '95%',
                maxHeight: '88vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
                border: '1px solid var(--da-border-orange)',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--da-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                background: 'var(--da-surface-2)'
              }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {(selectedApproved.story?.jira_story_key || selectedApproved.jira_story_key) && (
                      <span className="da-badge default" style={{ fontSize: '0.8rem', fontWeight: 700, border: '1px solid var(--da-border)' }}>
                        {selectedApproved.story?.jira_story_key || selectedApproved.jira_story_key}
                      </span>
                    )}
                    <span 
                      className="da-badge" 
                      style={{ 
                        background: 'rgba(34, 197, 94, 0.15)', 
                        color: 'var(--da-success)', 
                        border: '1px solid rgba(34, 197, 94, 0.3)', 
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={13} /> APPROVED & MERGED
                    </span>
                    {(selectedApproved.story?.external_provider || selectedApproved.external_provider) && (
                      <span className="da-badge" style={{ background: 'rgba(255, 90, 20, 0.1)', color: 'var(--da-accent)', border: '1px solid var(--da-border-orange)' }}>
                        {(selectedApproved.story?.external_provider || selectedApproved.external_provider).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1f2937', fontWeight: 700 }}>
                    {selectedApproved.story?.title || selectedApproved.title || 'Story Details'}
                  </h3>
                </div>
                <button 
                  className="da-btn da-btn-ghost" 
                  onClick={() => setSelectedApproved(null)}
                  style={{ padding: '6px 8px', borderRadius: 'var(--da-radius-sm)', color: 'var(--da-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Metadata Highlights Bar */}
              <div style={{
                padding: '1rem 1.5rem',
                background: '#fafafa',
                borderBottom: '1px solid var(--da-border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                fontSize: '0.85rem'
              }}>
                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    APPROVED BY
                  </span>
                  <strong style={{ color: '#1f2937', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserCheck size={14} color="var(--da-success)" />
                    {selectedApproved.reviewer?.name || selectedApproved.reviewer?.email || 'QA Reviewer'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    APPROVAL TIMESTAMP
                  </span>
                  <span style={{ color: '#374151', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    {selectedApproved.approved_at ? new Date(selectedApproved.approved_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recorded'}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    TARGET BRANCH
                  </span>
                  <code style={{ 
                    background: 'var(--da-surface-2)', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    color: 'var(--da-accent)', 
                    border: '1px solid var(--da-border-orange)', 
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    {selectedApproved.pr?.branch_name || selectedApproved.story?.source_branch || 'main'}
                  </code>
                </div>

                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    PULL REQUEST
                  </span>
                  {selectedApproved.pr?.pr_url ? (
                    <a 
                      href={selectedApproved.pr.pr_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ color: 'var(--da-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <GitPullRequest size={14} /> 
                      {selectedApproved.pr.pr_number ? `#${selectedApproved.pr.pr_number}` : 'View PR'} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--da-success)', fontWeight: 600 }}>Merged</span>
                  )}
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                background: '#FFFFFF'
              }}>
                {/* QA Feedback Section */}
                <div style={{
                  background: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '6px',
                  padding: '1rem 1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem', color: 'var(--da-success)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <MessageSquare size={15} /> QA Review Feedback & Sign-off Notes
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#1f2937', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {selectedApproved.comments || 'Story was verified against acceptance criteria and approved for merge.'}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--da-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                    Story Description
                  </h4>
                  <div style={{
                    background: 'var(--da-surface-2)',
                    padding: '1rem',
                    borderRadius: 'var(--da-radius-sm)',
                    border: '1px solid var(--da-border)',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    color: '#2d3748',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}>
                    {selectedApproved.story?.description || 'No description provided.'}
                  </div>
                </div>

                {/* Acceptance Criteria */}
                {selectedApproved.story?.acceptance_criteria && (
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--da-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      Acceptance Criteria
                    </h4>
                    <div style={{
                      background: 'var(--da-surface-2)',
                      padding: '1rem',
                      borderRadius: 'var(--da-radius-sm)',
                      border: '1px solid var(--da-border)',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      color: '#2d3748',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedApproved.story.acceptance_criteria}
                    </div>
                  </div>
                )}

                {/* PR Summary / Changes if available */}
                {selectedApproved.pr && (
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--da-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      Pull Request & Changes Summary
                    </h4>
                    <div style={{
                      background: 'var(--da-surface-2)',
                      padding: '1rem',
                      borderRadius: 'var(--da-radius-sm)',
                      border: '1px solid var(--da-border)',
                      fontSize: '0.85rem'
                    }}>
                      {selectedApproved.pr.pr_summary && (
                        <p style={{ margin: '0 0 0.75rem 0', color: '#374151', lineHeight: 1.5 }}>
                          {selectedApproved.pr.pr_summary}
                        </p>
                      )}
                      {selectedApproved.pr.changed_files && Array.isArray(selectedApproved.pr.changed_files) && selectedApproved.pr.changed_files.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--da-muted)', display: 'block', marginBottom: '4px' }}>
                            Changed Files ({selectedApproved.pr.changed_files.length}):
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {selectedApproved.pr.changed_files.map((f, fIdx) => (
                              <code key={fIdx} style={{ fontSize: '0.75rem', color: 'var(--da-text)' }}>
                                • {f}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--da-border)',
                background: 'var(--da-surface-2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <button
                  className="da-btn da-btn-outline"
                  style={{ borderColor: 'var(--da-border-orange)', color: 'var(--da-accent)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setLogsPanelStory({
                      id: selectedApproved.story_id,
                      title: selectedApproved.story?.title || selectedApproved.title
                    });
                  }}
                >
                  <Terminal size={15} /> View Pipeline Activity Logs
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedApproved.pr?.pr_url && (
                    <a
                      href={selectedApproved.pr.pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="da-btn da-btn-ghost"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--da-accent)' }}
                    >
                      <ExternalLink size={15} /> Open PR on GitHub
                    </a>
                  )}
                  <button 
                    className="da-btn da-btn-primary" 
                    onClick={() => setSelectedApproved(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PIPELINE LOGS PANEL ── */}
        {logsPanelStory && (
          <PipelineLogsPanel
            storyId={logsPanelStory.id}
            storyTitle={logsPanelStory.title}
            onClose={() => setLogsPanelStory(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
