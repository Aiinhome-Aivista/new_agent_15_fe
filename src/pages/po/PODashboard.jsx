import React, { useState, useEffect } from 'react';
import { 
  fetchStories, 
  fetchConnectorStatus,
  syncTasks,
  triggerRun
} from '../../services/api';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useDialog } from '../../contexts/DialogContext';
import { RefreshCw, Play, BookOpen, Plug, Plus, LayoutDashboard, FileText } from 'lucide-react';
import '../../styles/dashboard.css';

// Read sync interval from .env (defaults to 10 minutes)
const getSyncIntervalMs = () => {
  const envVal = import.meta.env.VITE_SYNC_INTERVAL_MINUTES ||
                 import.meta.env.VITE_SYNC_INTERVAL ||
                 import.meta.env.VITE_SYNC_INTERVAL_MS;
  if (!envVal) return 10 * 60 * 1000;
  const num = parseFloat(envVal);
  if (isNaN(num) || num <= 0) return 10 * 60 * 1000;
  // If <= 120, treat as minutes (e.g., 10 -> 10 mins = 600,000ms), otherwise milliseconds
  return num <= 120 ? num * 60 * 1000 : num;
};

export default function PODashboard() {
  const { showAlert, showPrompt } = useDialog();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state: 'dashboard', 'new-story', 'connectors'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Connectors states
  const [connectorStatus, setConnectorStatus] = useState(null);
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const syncIntervalMs = getSyncIntervalMs();

  // New Story Form states
  const [formData, setFormData] = useState({
    title: '', description: '', acceptance_criteria: ''
  });

  useEffect(() => {
    // Initial sync & load
    performSync(true);

    // Call sync API at duration specified in .env (10 min duration)
    const interval = setInterval(() => {
      performSync(true);
    }, syncIntervalMs);

    return () => clearInterval(interval);
  }, [syncIntervalMs]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadData();
    } else if (activeTab === 'connectors') {
      loadConnectorStatus();
    }
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchStories();
      setStories(data);
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

  async function performSync(silent = true) {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncTasks();
      setLastSynced(new Date());
      if (!silent) {
        await showAlert('Sync completed successfully!');
      }
      await loadData();
      if (activeTab === 'connectors') {
        await loadConnectorStatus();
      }
    } catch (e) {
      console.error('Sync failed:', e);
      if (!silent) {
        await showAlert('Error syncing stories: ' + (e.response?.data?.error || e.message));
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleManualSync() {
    await performSync(false);
  }

  const handleRunDevaa = async (storyId) => {
    try {
      const branch = await showPrompt('Enter a branch name (e.g. feature/devaa-update):', 'feature/story-' + storyId);
      if (!branch) return;

      await triggerRun(storyId, branch);
      await showAlert('Pipeline triggered! Refreshing status in a moment.');
      setTimeout(loadData, 2000);
    } catch (error) {
      await showAlert('Failed to trigger workflow: ' + (error.response?.data?.error || error.message));
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
      await showAlert('Story created successfully!');
      setActiveTab('dashboard');
    } catch (error) {
      await showAlert('Error creating story: ' + error.message);
    }
  };

  const statusCounts = {
    'todo': stories.filter(s => s.status === 'todo').length,
    'in-progress': stories.filter(s => s.status === 'in-progress').length,
    'qa-testing': stories.filter(s => s.status === 'qa-testing').length,
    'done': stories.filter(s => s.status === 'done').length
  };

  const TABS = [
    { id: 'dashboard', label: <><LayoutDashboard size={16} /> Dashboard</> },
    { id: 'new-story', label: <><Plus size={16} /> New Story</> },
    { id: 'connectors', label: <><Plug size={16} /> Connectors</> }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div className="da-section-title">My Stories</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {lastSynced && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Last synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Auto: {Math.round(syncIntervalMs / 60000)}m)
                  </span>
                )}
                <button className="da-btn da-btn-outline" onClick={handleManualSync} disabled={syncing}>
                  <RefreshCw size={16} className={syncing ? 'lucide-animated-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Jira'}
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="da-loading"><div className="da-spinner"/> Loading...</div>
            ) : stories.length === 0 ? (
              <div className="da-empty">
                <div className="da-empty-icon"><FileText size={48} /></div>
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
                      <th>Assignee</th>
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
                        <td>
                          {story.repository_details && story.repository_details.length > 0 && story.repository_details[0].external_assignee 
                            ? story.repository_details[0].external_assignee 
                            : '-'}
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
                            <Play size={14} /> Run
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
                    {connectorStatus.active_provider === 'jira' ? <BookOpen size={24} /> : <Plug size={24} />}
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

                <div className="da-connector-actions" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <button 
                    className="da-btn da-btn-primary" 
                    onClick={handleManualSync}
                    disabled={syncing}
                  >
                    <RefreshCw size={16} className={syncing ? 'lucide-animated-spin' : ''} /> {syncing ? 'Syncing...' : 'Trigger Manual Sync'}
                  </button>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Auto-sync duration: {Math.round(syncIntervalMs / 60000)} minutes (configured in <code>.env</code>)
                  </span>
                </div>
              </div>
            ) : (
              <div className="da-empty">
                <div className="da-empty-icon"><Plug size={48} /></div>
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
