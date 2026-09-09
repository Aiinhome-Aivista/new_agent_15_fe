import React, { useState, useEffect } from 'react';
import { 
  fetchStories, 
  fetchAdminMetrics,
  fetchAuditLogs,
  fetchConnectorStatus,
  syncTasks,
  triggerRun
} from '../../services/api';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import '../../styles/dashboard.css';

export default function PODashboard() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state: 'dashboard', 'new-story', 'connectors'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard states
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [polling, setPolling] = useState(false);
  
  // Connectors states
  const [connectorStatus, setConnectorStatus] = useState(null);
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // New Story Form states
  const [formData, setFormData] = useState({
    title: '', description: '', acceptance_criteria: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setPolling(p => !p);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadData();
    } else if (activeTab === 'connectors') {
      loadConnectorStatus();
    }
  }, [polling, activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchStories();
      setStories(data);
      
      const m = await fetchAdminMetrics();
      setMetrics(m);

      const aud = await fetchAuditLogs({ limit: 10 });
      setLogs(aud);
    } catch (error) {
      console.error('Error loading PO dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadConnectorStatus() {
    try {
      setConnectorLoading(true);
      const data = await fetchConnectorStatus();
      setConnectorStatus(data);
    } catch (e) {
      console.error('Error fetching connector status:', e);
    } finally {
      setConnectorLoading(false);
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    try {
      await syncTasks();
      alert('Sync completed successfully!');
      // Refresh connector and stories
      loadConnectorStatus();
      loadData();
    } catch (e) {
      console.error(e);
      alert('Error syncing stories: ' + (e.response?.data?.error || e.message));
    } finally {
      setSyncing(false);
    }
  }

  const handleRunDevaa = async (storyId) => {
    try {
      const branch = prompt('Enter a branch name (e.g. feature/devaa-update):', 'feature/story-' + storyId);
      if (!branch) return;

      await triggerRun(storyId, branch);
      alert('Pipeline triggered! Refreshing status in a moment.');
      setTimeout(loadData, 2000);
    } catch (error) {
      alert('Failed to trigger workflow: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/stories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create story');
      setFormData({ title: '', description: '', acceptance_criteria: '' });
      alert('Story created successfully!');
      setActiveTab('dashboard');
    } catch (error) {
      alert('Error creating story: ' + error.message);
    }
  };

  const summary = metrics?.summary || {};
  const statusCounts = {
    'todo': stories.filter(s => s.status === 'todo').length,
    'in-progress': stories.filter(s => s.status === 'in-progress').length,
    'qa-testing': stories.filter(s => s.status === 'qa-testing').length,
    'done': stories.filter(s => s.status === 'done').length
  };

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'new-story', label: '➕ New Story' },
    { id: 'connectors', label: '🔌 Connectors' }
  ];

  return (
    <DashboardLayout 
      title="Product Owner"
      personaClass="po"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ── DASHBOARD VIEW ── */}
      {activeTab === 'dashboard' && (
        <div className="da-body">
          <div className="da-stats-grid">
            <div className="da-stat-card"><div className="da-stat-label">Total Stories</div><div className="da-stat-value purple">{stories.length}</div></div>
            <div className="da-stat-card"><div className="da-stat-label">To Do</div><div className="da-stat-value">{statusCounts['todo']}</div></div>
            <div className="da-stat-card"><div className="da-stat-label">In Progress</div><div className="da-stat-value blue">{statusCounts['in-progress']}</div></div>
            <div className="da-stat-card"><div className="da-stat-label">QA Testing</div><div className="da-stat-value yellow">{statusCounts['qa-testing']}</div></div>
            <div className="da-stat-card"><div className="da-stat-label">Done</div><div className="da-stat-value green">{statusCounts['done']}</div></div>
          </div>

          <div className="da-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="da-section-title">My Stories</div>
              <button className="da-btn da-btn-outline" onClick={handleManualSync}>
                🔄 Sync Jira
              </button>
            </div>
            
            {loading ? (
              <div className="da-loading"><div className="da-spinner"/> Loading...</div>
            ) : stories.length === 0 ? (
              <div className="da-empty">
                <div className="da-empty-icon">📝</div>
                <h3>No stories found</h3>
                <p>Create a new story to start building your product.</p>
              </div>
            ) : (
              <div className="da-table-wrap">
                <table className="da-table">
                  <thead>
                    <tr>
                      <th>Story</th>
                      <th>Jira Key</th>
                      <th>Status</th>
                      <th>Branch</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories.map(story => (
                      <tr key={story.id}>
                        <td>
                          <strong>{story.title}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#7b82a8', marginTop: '4px' }}>
                            {story.description.substring(0, 50)}...
                          </div>
                        </td>
                        <td>
                          {story.jira_story_key ? (
                            <span className="da-badge default">{story.jira_story_key}</span>
                          ) : '-'}
                        </td>
                        <td><span className={`da-badge ${story.status}`}>{story.status.toUpperCase()}</span></td>
                        <td>{story.current_branch || '-'}</td>
                        <td>
                          <button 
                            className="da-btn da-btn-primary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={() => handleRunDevaa(story.id)}
                            disabled={story.status !== 'todo'}
                          >
                            ▶ Run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEW STORY VIEW ── */}
      {activeTab === 'new-story' && (
        <div className="da-body" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="da-section">
            <div className="da-section-title" style={{ marginBottom: '1rem' }}>Create New Story</div>
            <form onSubmit={handleCreateStory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="da-form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Add Login Page"
                  required
                />
              </div>
              <div className="da-form-group">
                <label>Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  placeholder="Detailed description..."
                  required
                />
              </div>
              <div className="da-form-group">
                <label>Acceptance Criteria</label>
                <textarea 
                  value={formData.acceptance_criteria}
                  onChange={e => setFormData({...formData, acceptance_criteria: e.target.value})}
                  rows={4}
                  placeholder="- Must have email/password fields&#10;- Must validate input"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="da-btn da-btn-ghost" onClick={() => setActiveTab('dashboard')}>Cancel</button>
                <button type="submit" className="da-btn da-btn-primary">Create Story</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONNECTORS VIEW ── */}
      {activeTab === 'connectors' && (
        <div className="da-body">
          <div className="da-section">
            <div className="da-section-title" style={{ marginBottom: '1.5rem' }}>Active Task Connectors</div>
            
            {connectorLoading ? (
               <div className="da-loading"><div className="da-spinner"/> Checking Connectors...</div>
            ) : connectorStatus && connectorStatus.active_provider !== 'none' ? (
              <div className="da-connector-card">
                <div className="da-connector-header">
                  <div className="da-connector-icon">
                    {connectorStatus.active_provider === 'jira' ? '📘' : '🔌'}
                  </div>
                  <div className="da-connector-info">
                    <h3>{(connectorStatus.active_provider || '').toUpperCase()}</h3>
                    <p>Connected via Environment (.env)</p>
                  </div>
                  <div className="da-connector-status-badge active">
                    ● Active
                  </div>
                </div>
                
                <div className="da-connector-details">
                  <div className="da-detail-row">
                    <span>Account Email:</span>
                    <strong>{connectorStatus.details?.account || 'N/A'}</strong>
                  </div>
                  {connectorStatus.details?.base_url && (
                    <div className="da-detail-row">
                      <span>Base URL:</span>
                      <strong>{connectorStatus.details.base_url}</strong>
                    </div>
                  )}
                  {connectorStatus.project && (
                    <div className="da-detail-row">
                      <span>Project:</span>
                      <strong>{connectorStatus.project}</strong>
                    </div>
                  )}
                </div>

                <div className="da-connector-actions" style={{ marginTop: '1.5rem' }}>
                  <button 
                    className="da-btn da-btn-primary" 
                    onClick={handleManualSync}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : '🔄 Trigger Manual Sync'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="da-empty">
                <div className="da-empty-icon">🔌</div>
                <h3>No Connectors Configured</h3>
                <p>To pull stories automatically from Jira or Linear, update your `.env` file with the provider credentials.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
