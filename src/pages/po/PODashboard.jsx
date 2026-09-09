import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchStories, createStory, triggerRun, fetchWorkflowSteps, syncTasks } from '../../services/api';
import '../../styles/dashboard.css';

const STATUS_CLASS = {
  'TO-DO': 'todo', 'IN-PROGRESS': 'inprogress',
  'QA-TESTING': 'qa-testing', 'DONE': 'done', 'INVALID': 'invalid'
};

const AGENT_ICONS = {
  Intake: '🔍', RepoAnalysis: '📁', Developer: '💻',
  Validator: '✅', BranchPR: '🔀', Comment: '💬', Rework: '🔁'
};

export default function PODashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [selectedStory, setSelectedStory] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', acceptance_criteria: '',
    source_branch: '', jira_story_key: '',
    repository_details: '[{"name": "", "url": "", "branch": "main"}]'
  });

  useEffect(() => { loadStories(); }, []);

  async function loadStories() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStories();
      setStories(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load stories.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      let repoDetails = [];
      try { repoDetails = JSON.parse(form.repository_details); } catch {}
      await createStory({ ...form, repository_details: repoDetails });
      setShowModal(false);
      setForm({ title:'', description:'', acceptance_criteria:'', source_branch:'', jira_story_key:'', repository_details:'[{"name":"","url":"","branch":"main"}]' });
      loadStories();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create story.');
    }
  }

  async function handleSync() {
    try {
      setLoading(true);
      setError(null);
      const result = await syncTasks();
      alert(`Sync Complete: ${result.stories_created} new stories imported. (${result.stories_skipped} skipped).`);
      loadStories();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to sync tasks.');
      setLoading(false);
    }
  }

  async function handleRun(story) {
    if (!window.confirm(`Trigger DEVAA run for "${story.title}"?\nThis will start all 8 agents.`)) return;
    setRunningId(story.id);
    setRunResult(null);
    try {
      const result = await triggerRun(story.id);
      setRunResult({ id: story.id, ...result });
      loadStories();
    } catch (e) {
      setRunResult({ id: story.id, success: false, error: e.response?.data?.error || 'Run failed.' });
    } finally {
      setRunningId(null);
    }
  }

  async function handleViewSteps(story) {
    setSelectedStory(story);
    setStepsLoading(true);
    try {
      const workflows = story.workflows || [];
      if (workflows.length > 0) {
        const data = await fetchWorkflowSteps(workflows[0].id);
        setSteps(data);
      } else {
        setSteps([]);
      }
    } catch { setSteps([]); }
    setStepsLoading(false);
  }

  const counts = {
    total: stories.length,
    todo: stories.filter(s => s.status === 'TO-DO').length,
    inprogress: stories.filter(s => s.status === 'IN-PROGRESS').length,
    qa: stories.filter(s => s.status === 'QA-TESTING').length,
    done: stories.filter(s => s.status === 'DONE').length,
  };

  return (
    <div className="da-page">
      {/* Header */}
      <header className="da-header">
        <div className="da-header-left">
          <span className="da-logo">DEVAA</span>
          <span className="da-persona-badge po">Product Owner</span>
        </div>
        <div className="da-header-right">
          <span className="da-user-info">👤 {user?.name}</span>
          <button className="da-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <div className="da-body">
        {error && <div className="da-alert error">⚠ {error}</div>}
        {runResult && (
          <div className={`da-alert ${runResult.success ? 'success' : 'error'}`}>
            {runResult.success
              ? `✅ Run complete! PR: ${runResult.pr_url || 'Created'} · ${runResult.loop_iterations} iteration(s)`
              : `❌ Run failed: ${runResult.error}`}
          </div>
        )}

        {/* Stats */}
        <div className="da-stats-grid">
          <div className="da-stat-card"><div className="da-stat-label">Total Stories</div><div className="da-stat-value purple">{counts.total}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">TO-DO</div><div className="da-stat-value">{counts.todo}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">In Progress</div><div className="da-stat-value blue">{counts.inprogress}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">QA Testing</div><div className="da-stat-value yellow">{counts.qa}</div></div>
          <div className="da-stat-card"><div className="da-stat-label">Done</div><div className="da-stat-value green">{counts.done}</div></div>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedStory ? '1fr 380px' : '1fr', gap: '1.5rem' }}>
          {/* Stories Table */}
          <div className="da-section">
            <div className="da-section-header">
              <span className="da-section-title">📋 My Stories</span>
              <div>
                <button className="da-btn da-btn-ghost" onClick={handleSync} style={{ marginRight: '0.5rem' }}>🔄 Sync Jira</button>
                <button className="da-btn da-btn-primary" onClick={() => setShowModal(true)}>+ New Story</button>
              </div>
            </div>

            {loading ? (
              <div className="da-loading"><div className="da-spinner" /> Loading stories…</div>
            ) : stories.length === 0 ? (
              <div className="da-empty"><div className="da-empty-icon">📂</div><h3>No stories yet</h3><p>Click "+ New Story" to create your first DEVAA story.</p></div>
            ) : (
              <div className="da-table-wrap">
                <table className="da-table">
                  <thead><tr>
                    <th>Story</th><th>Jira Key</th><th>Status</th><th>Branch</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {stories.map(story => (
                      <tr key={story.id} onClick={() => handleViewSteps(story)}>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{story.title}</div>
                          <div style={{ color: 'var(--da-muted)', fontSize: '0.75rem', marginTop: 2 }}>{story.description?.substring(0, 60)}…</div>
                        </td>
                        <td><code style={{ fontSize: '0.78rem', color: 'var(--da-info)' }}>{story.jira_story_key || '—'}</code></td>
                        <td><span className={`da-badge ${STATUS_CLASS[story.status] || 'todo'}`}>{story.status}</span></td>
                        <td><code style={{ fontSize: '0.75rem', color: 'var(--da-muted)' }}>{story.source_branch || '—'}</code></td>
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            className="da-btn da-btn-primary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                            disabled={runningId === story.id || ['IN-PROGRESS', 'QA-TESTING'].includes(story.status)}
                            onClick={() => handleRun(story)}
                          >
                            {runningId === story.id ? '⏳ Running…' : '▶ Run'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Agent Steps Panel */}
          {selectedStory && (
            <div className="da-section">
              <div className="da-section-header">
                <span className="da-section-title">🤖 Agent Timeline</span>
                <button className="da-btn da-btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => setSelectedStory(null)}>✕ Close</button>
              </div>
              <div style={{ background: 'var(--da-surface)', borderRadius: 'var(--da-radius)', border: '1px solid var(--da-border)', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{selectedStory.title}</div>
                {stepsLoading ? (
                  <div className="da-loading"><div className="da-spinner" /></div>
                ) : steps.length === 0 ? (
                  <div className="da-empty" style={{ padding: '2rem' }}><div className="da-empty-icon">🤖</div><p>No agent runs yet. Click ▶ Run to start.</p></div>
                ) : (
                  <div className="da-timeline">
                    {steps.map(step => (
                      <div className="da-timeline-item" key={step.id}>
                        <div className={`da-timeline-dot ${step.status?.toLowerCase()}`}>{AGENT_ICONS[step.step_type] || '•'}</div>
                        <div className="da-timeline-content">
                          <div className="da-timeline-label">{step.step_type}</div>
                          <div className="da-timeline-meta">
                            <span className={`da-badge ${step.status?.toLowerCase()}`}>{step.status}</span>
                            {step.token_count > 0 && <span style={{ marginLeft: 8 }}>🪙 {step.token_count} tokens</span>}
                            {step.guardrail_triggered && <span style={{ marginLeft: 8, color: 'var(--da-warning)' }}>⚠ Guardrail</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Story Modal */}
      {showModal && (
        <div className="da-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="da-modal" onClick={e => e.stopPropagation()}>
            <div className="da-modal-title">📋 Create New Story</div>
            <form className="da-form" onSubmit={handleCreate}>
              <div className="da-field">
                <label>Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Add user authentication" />
              </div>
              <div className="da-field">
                <label>Jira Story Key</label>
                <input value={form.jira_story_key} onChange={e => setForm({ ...form, jira_story_key: e.target.value })} placeholder="e.g., DEVAA-42" />
              </div>
              <div className="da-field">
                <label>Description *</label>
                <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed description of what needs to be built..." />
              </div>
              <div className="da-field">
                <label>Acceptance Criteria *</label>
                <textarea rows={4} value={form.acceptance_criteria} onChange={e => setForm({ ...form, acceptance_criteria: e.target.value })} placeholder="- User can log in with email/password&#10;- Token expires in 24h&#10;- Error shown on invalid credentials" />
              </div>
              <div className="da-field">
                <label>Source Branch *</label>
                <input value={form.source_branch} onChange={e => setForm({ ...form, source_branch: e.target.value })} placeholder="e.g., main or develop" />
              </div>
              <div className="da-field">
                <label>Repository Details (JSON array)</label>
                <textarea rows={3} value={form.repository_details} onChange={e => setForm({ ...form, repository_details: e.target.value })} placeholder='[{"name":"my-repo","url":"https://github.com/org/repo","branch":"main"}]' />
              </div>
              <div className="da-modal-actions">
                <button type="button" className="da-btn da-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="da-btn da-btn-primary">Create Story</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
