import React, { useState, useEffect } from 'react';
import { 
  fetchStories, 
  fetchConnectorStatus,
  fetchJiraResources,
  syncTasks,
  triggerRun,
  triggerRework,
  updateStory
} from '../../services/api';
import PipelineLogsPanel from '../../components/PipelineLogsPanel';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useDialog } from '../../contexts/DialogContext';
import { 
  RefreshCw, Play, BookOpen, Plug, Plus, LayoutDashboard, FileText, X, User,
  Paperclip, UploadCloud, File, Trash2, Tag, Calendar, Hash, CheckCircle2,
  Edit3, Filter, Lock, Search, Sparkles, ExternalLink, AlertTriangle, RotateCcw
} from 'lucide-react';


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
  const [selectedStory, setSelectedStory] = useState(null);
  
  // Tab state: 'dashboard', 'new-story', 'connectors'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Pipeline execution state per story: { [storyId]: { status: 'running' | 'success' | 'failed', stage: string, pr_url: string, error: string } }
  const [pipelineRuns, setPipelineRuns] = useState({});

  // Logs panel: which story's logs to show (null = closed)
  const [logsPanelStory, setLogsPanelStory] = useState(null);

  const PIPELINE_STAGES = [
    'Intake',
    'Repo Analysis',
    'Developer',
    'Validator',
    'Branch & PR',
    'Finalizing'
  ];
  
  // Connectors states
  const [connectorStatus, setConnectorStatus] = useState(null);
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const syncIntervalMs = getSyncIntervalMs();
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  // Jira Metadata states for New Story
  const [jiraProjects, setJiraProjects] = useState([]);
  const [jiraUsers, setJiraUsers] = useState([]);
  const [jiraSprints, setJiraSprints] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [projectInputMode, setProjectInputMode] = useState('select'); // 'select' | 'manual'
  const [assigneeSelectValue, setAssigneeSelectValue] = useState(''); // accountId | '__manual__' | ''
  const [manualAssigneeText, setManualAssigneeText] = useState('');

  // Attachments state
  const fileInputRef = React.useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  // New Story Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    acceptance_criteria: '',
    priority: 'Medium',
    assignee: '',
    issue_type: 'Story',
    status: 'TO-DO',
    project_key: '',
    start_date: getTodayDateStr(),
    due_date: '',
    story_points: '',
    labels: '',
    sprint_id: 'active',
    sync_to_jira: true
  });
  const [creating, setCreating] = useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const filesArray = Array.from(newFiles);
    setSelectedFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}-${f.size}`));
      const nonDuplicates = filesArray.filter(f => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...nonDuplicates];
    });
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Table filter state: 'all' | 'devaa' | 'todo' | 'inprogress' | 'done'
  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to determine if story was created in DEVAA
  const isDevaaStory = (story) => {
    if (!story) return false;
    if (story.is_created_in_devaa) return true;
    const details = story.repository_details?.[0] || {};
    return Boolean(
      details.created_in_devaa ||
      details.origin === 'devaa' ||
      details.priority ||
      details.story_points ||
      details.labels ||
      details.start_date ||
      (details.attachments && details.attachments.length > 0) ||
      story.external_provider === 'manual'
    );
  };

  // Edit Story Modal states
  const [editingStory, setEditingStory] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    acceptance_criteria: '',
    priority: 'Medium',
    assignee: '',
    assignee_account_id: '',
    story_points: '',
    due_date: '',
    labels: '',
    source_branch: 'main'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEditStory = (story) => {
    const details = story.repository_details?.[0] || {};
    let matchedAccountId = '';
    if (jiraUsers && jiraUsers.length > 0 && details.external_assignee) {
      const match = jiraUsers.find(u => 
        u.displayName === details.external_assignee ||
        u.emailAddress === details.external_assignee ||
        u.accountId === details.external_assignee
      );
      if (match) matchedAccountId = match.accountId;
    }

    setEditFormData({
      title: story.title || '',
      description: story.description || '',
      acceptance_criteria: story.acceptance_criteria || '',
      priority: details.priority || 'Medium',
      assignee: details.external_assignee || '',
      assignee_account_id: matchedAccountId,
      story_points: details.story_points || '',
      due_date: details.due_date || '',
      labels: details.labels || '',
      source_branch: story.source_branch || story.current_branch || 'main'
    });
    setEditingStory(story);
  };


  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStory) return;
    setSavingEdit(true);
    try {
      const res = await updateStory(editingStory.id, editFormData);
      if (res.warning) {
        await showAlert(res.warning);
      } else {
        await showAlert('Story updated successfully! (Synced with Jira)');
      }
      setEditingStory(null);
      await loadData();
    } catch (err) {
      await showAlert('Failed to update story: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingEdit(false);
    }
  };



  useEffect(() => {
    // Initial sync, load stories & connector status
    performSync(true);
    loadConnectorStatus();

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
    } else if (activeTab === 'new-story') {
      loadJiraResources(formData.project_key || '');
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

  async function loadJiraResources(projectKey = '') {
    try {
      setResourcesLoading(true);
      const res = await fetchJiraResources(projectKey);
      if (res.projects && res.projects.length > 0) {
        setJiraProjects(res.projects);
        if (!formData.project_key) {
          const defKey = res.default_project || res.projects[0].key;
          setFormData(prev => ({ ...prev, project_key: defKey }));
        }
      }
      if (res.users && res.users.length > 0) {
        setJiraUsers(res.users);
      }
      if (res.sprints && res.sprints.length > 0) {
        setJiraSprints(res.sprints);
      }
    } catch (e) {
      console.warn('Failed to fetch Jira resources:', e);
    } finally {
      setResourcesLoading(false);
    }
  }

  const handleProjectChange = async (newProjKey) => {
    if (newProjKey === '__manual__') {
      setProjectInputMode('manual');
    } else {
      setProjectInputMode('select');
      setFormData(prev => ({ ...prev, project_key: newProjKey }));
      loadJiraResources(newProjKey);
    }
  };

  async function loadConnectorStatus() {
    try {
      setConnectorLoading(true);
      const data = await fetchConnectorStatus();
      setConnectorStatus(data);
      if (data?.project && !formData.project_key) {
        setFormData(prev => ({ ...prev, project_key: data.project }));
      }
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

  const handleRunDevaa = async (storyId, isRework = false) => {
    // Open logs panel automatically so user can watch live
    const runningStory = stories.find(s => s.id === storyId);
    if (runningStory) setLogsPanelStory(runningStory);

    // Set initial running state
    setPipelineRuns(prev => ({
      ...prev,
      [storyId]: {
        status: 'running',
        stage: 'Intake',
        isRework,
        stageIndex: 0
      }
    }));

    // Live stage progression timer while waiting for backend execution
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      stageIdx++;
      if (stageIdx < PIPELINE_STAGES.length) {
        setPipelineRuns(prev => {
          if (prev[storyId]?.status !== 'running') return prev;
          return {
            ...prev,
            [storyId]: {
              ...prev[storyId],
              stage: PIPELINE_STAGES[stageIdx],
              stageIndex: stageIdx
            }
          };
        });
      }
    }, 4500);

    try {
      const res = isRework ? await triggerRework(storyId) : await triggerRun(storyId);
      clearInterval(stageTimer);

      if (res && (res.success || res.pr_url || res.status === 'Awaiting QA' || res.status === 'QA-TESTING')) {
        setPipelineRuns(prev => ({
          ...prev,
          [storyId]: {
            status: 'success',
            pr_url: res.pr_url,
            branch_name: res.branch_name,
            isRework
          }
        }));
        await showAlert(
          `Pipeline ${isRework ? 'Rework ' : ''}succeeded! PR created: ${res.pr_url || 'PR generated'}`
        );
        setTimeout(loadData, 1500);
      } else {
        const errMsg = res?.error || 'Pipeline completed with validation errors.';
        setPipelineRuns(prev => ({
          ...prev,
          [storyId]: {
            status: 'failed',
            stage: res?.stage || 'Pipeline',
            error: errMsg,
            isRework
          }
        }));
        await showAlert(`Pipeline ${isRework ? 'Rework ' : ''}failed: ${errMsg}`);
        setTimeout(loadData, 2000);
      }
    } catch (error) {
      clearInterval(stageTimer);
      const errMsg = error.response?.data?.error || error.message;
      setPipelineRuns(prev => ({
        ...prev,
        [storyId]: {
          status: 'failed',
          stage: 'Error',
          error: errMsg,
          isRework
        }
      }));
      await showAlert(`Pipeline execution failed: ${errMsg}`);
      setTimeout(loadData, 2000);
    }
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      let resolvedAssigneeName = '';
      let resolvedAccountId = null;

      if (assigneeSelectValue === '__manual__') {
        resolvedAssigneeName = manualAssigneeText.trim();
      } else if (assigneeSelectValue) {
        resolvedAccountId = assigneeSelectValue;
        const matched = jiraUsers.find(u => u.accountId === assigneeSelectValue);
        resolvedAssigneeName = matched ? (matched.displayName || matched.emailAddress) : assigneeSelectValue;
      }

      const postData = new FormData();
      postData.append('title', formData.title.trim());
      postData.append('description', formData.description || '');
      postData.append('acceptance_criteria', formData.acceptance_criteria || '');
      postData.append('priority', formData.priority || 'Medium');
      postData.append('assignee', resolvedAssigneeName);
      if (resolvedAccountId) postData.append('assignee_account_id', resolvedAccountId);
      postData.append('issue_type', formData.issue_type || 'Story');
      postData.append('status', formData.status || 'TO-DO');
      if (formData.project_key) postData.append('project_key', formData.project_key);
      if (formData.start_date) postData.append('start_date', formData.start_date);
      if (formData.due_date) postData.append('due_date', formData.due_date);
      if (formData.story_points) postData.append('story_points', formData.story_points);
      if (formData.labels) postData.append('labels', formData.labels);
      postData.append('sprint_id', formData.sprint_id || 'active');
      postData.append('sync_to_jira', formData.sync_to_jira ? 'true' : 'false');

      selectedFiles.forEach((file) => {
        postData.append('attachments', file);
      });

      const response = await fetch('/api/stories/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: postData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create story');
      }

      setFormData(prev => ({
        title: '',
        description: '',
        acceptance_criteria: '',
        priority: 'Medium',
        assignee: '',
        issue_type: 'Story',
        status: 'TO-DO',
        project_key: prev.project_key,
        start_date: getTodayDateStr(),
        due_date: '',
        story_points: '',
        labels: '',
        sprint_id: 'active',
        sync_to_jira: true
      }));
      setAssigneeSelectValue('');
      setManualAssigneeText('');
      setSelectedFiles([]);

      let successMsg = 'Story created successfully!';
      if (data.jira_story_key) {
        successMsg = `Story created in DEVAA & Jira (${data.jira_story_key})!`;
        if (selectedFiles.length > 0) {
          successMsg += ` (${selectedFiles.length} file(s) attached)`;
        }
      }
      if (data.warning) {
        await showAlert(data.warning);
      } else {
        await showAlert(successMsg);
      }

      await loadData();
      setTableFilter('devaa');
      setActiveTab('dashboard');
    } catch (error) {
      await showAlert('Error creating story: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const statusCounts = {
    'all': stories.length,
    'devaa': stories.filter(s => isDevaaStory(s)).length,
    'todo': stories.filter(s => {
      const st = (s.status || '').toLowerCase().replace(/[-_ ]/g, '');
      return st === 'todo' || st === 'open';
    }).length,
    'in-progress': stories.filter(s => ['in-progress', 'in_progress', 'inprogress'].includes((s.status || '').toLowerCase().replace(/[-_ ]/g, ''))).length,
    'qa-testing': stories.filter(s => ['qa-testing', 'qa_testing', 'qatesting'].includes((s.status || '').toLowerCase().replace(/[-_ ]/g, ''))).length,
    'done': stories.filter(s => (s.status || '').toLowerCase().replace(/[-_ ]/g, '') === 'done').length
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div className="da-section-title" style={{ margin: 0 }}>Stories</div>
                
                {/* Table Filter Tabs */}
                <div style={{
                  display: 'flex',
                  background: 'var(--da-surface-2)',
                  padding: '3px',
                  borderRadius: '6px',
                  border: '1px solid var(--da-border-orange)',
                  gap: '2px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => setTableFilter('all')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: tableFilter === 'all' ? 'var(--da-accent)' : 'transparent',
                      color: tableFilter === 'all' ? '#FFF' : 'var(--da-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    All ({statusCounts['all']})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('devaa')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: tableFilter === 'devaa' ? 'var(--da-accent)' : 'transparent',
                      color: tableFilter === 'devaa' ? '#FFF' : 'var(--da-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={12} /> Created in DEVAA ({statusCounts['devaa']})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('todo')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: tableFilter === 'todo' ? 'var(--da-accent)' : 'transparent',
                      color: tableFilter === 'todo' ? '#FFF' : 'var(--da-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit3 size={12} /> To Do / Editable ({statusCounts['todo']})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('inprogress')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: tableFilter === 'inprogress' ? 'var(--da-accent)' : 'transparent',
                      color: tableFilter === 'inprogress' ? '#FFF' : 'var(--da-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    In Progress ({statusCounts['in-progress']})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('done')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: tableFilter === 'done' ? 'var(--da-accent)' : 'transparent',
                      color: tableFilter === 'done' ? '#FFF' : 'var(--da-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Done ({statusCounts['done']})
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search stories..."
                    style={{ 
                      paddingLeft: '32px', 
                      paddingRight: searchQuery ? '26px' : '10px',
                      fontSize: '0.8rem', 
                      height: '32px', 
                      borderRadius: 'var(--da-radius-sm)', 
                      border: '1px solid var(--da-border-orange)',
                      background: 'var(--da-surface-2)',
                      width: '100%'
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {lastSynced && (
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <button className="da-btn da-btn-outline" onClick={handleManualSync} disabled={syncing} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                  <RefreshCw size={14} className={syncing ? 'lucide-animated-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Jira'}
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="da-loading"><div className="da-spinner"/> Loading stories...</div>
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
                      <th style={{ minWidth: '240px' }}>Story</th>
                      <th>Jira Key</th>
                      <th>Priority & Points</th>
                      <th>Assignee</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '160px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories
                      .filter(story => {
                        const normStatus = (story.status || '').toLowerCase().replace(/[-_ ]/g, '');
                        if (tableFilter === 'todo' && !(normStatus === 'todo' || normStatus === 'open')) return false;
                        if (tableFilter === 'devaa' && !isDevaaStory(story)) return false;
                        if (tableFilter === 'inprogress' && !['inprogress', 'in_progress'].includes(normStatus)) return false;
                        if (tableFilter === 'done' && normStatus !== 'done') return false;

                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase().trim();
                          const details = story.repository_details?.[0] || {};
                          const matchTitle = (story.title || '').toLowerCase().includes(q);
                          const matchKey = (story.jira_story_key || '').toLowerCase().includes(q);
                          const matchAssignee = (details.external_assignee || '').toLowerCase().includes(q);
                          const matchLabels = (details.labels || '').toLowerCase().includes(q);
                          if (!matchTitle && !matchKey && !matchAssignee && !matchLabels) return false;
                        }
                        return true;
                      })
                      .map(story => {
                        const normStatus = (story.status || '').toLowerCase().replace(/[-_ ]/g, '');
                        const isTodo = normStatus === 'todo' || normStatus === 'open';
                        const details = story.repository_details?.[0] || {};
                        const createdInDevaa = isDevaaStory(story);

                        return (
                          <tr 
                            key={story.id}
                            onClick={() => setSelectedStory(story)}
                            style={{ cursor: 'pointer' }}
                            title="Click to view full story details"
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: '#1f2937' }}>{story.title}</span>
                                {createdInDevaa && (
                                  <span 
                                    className="da-badge" 
                                    style={{ 
                                      background: 'rgba(255, 90, 20, 0.1)', 
                                      color: 'var(--da-accent)', 
                                      border: '1px solid var(--da-border-orange)', 
                                      fontSize: '0.65rem', 
                                      padding: '1px 6px',
                                      fontWeight: 700
                                    }}
                                    title="Created inside DEVAA"
                                  >
                                    DEVAA
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                {details.labels && String(details.labels).split(',').map((lbl, i) => (
                                  <span key={i} className="da-badge default" style={{ fontSize: '0.68rem', padding: '0px 5px' }}>
                                    #{lbl.trim()}
                                  </span>
                                ))}
                                {story.description && (
                                  <span style={{ fontSize: '0.78rem', color: '#7b82a8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                                    {story.description.substring(0, 50)}...
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {story.jira_story_key ? (
                                <span className="da-badge default" style={{ fontWeight: 700 }}>{story.jira_story_key}</span>
                              ) : (
                                <span style={{ color: '#999', fontSize: '0.8rem' }}>Manual</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span className="da-badge" style={{ 
                                  background: (details.priority || 'Medium') === 'Highest' || (details.priority || 'Medium') === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 90, 20, 0.1)',
                                  color: (details.priority || 'Medium') === 'Highest' || (details.priority || 'Medium') === 'High' ? 'var(--da-danger)' : 'var(--da-accent)',
                                  border: '1px solid var(--da-border-orange)',
                                  fontSize: '0.72rem'
                                }}>
                                  {details.priority || 'Medium'}
                                </span>
                                {details.story_points && (
                                  <span style={{ fontSize: '0.72rem', background: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    {details.story_points} pts
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {details.external_assignee ? (
                                <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}>
                                  {details.external_assignee}
                                </span>
                              ) : (
                                <span style={{ color: '#999', fontSize: '0.8rem' }}>Unassigned</span>
                              )}
                            </td>
                            <td>
                              {details.due_date ? (
                                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                                  {details.due_date}
                                </span>
                              ) : (
                                <span style={{ color: '#999', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            <td>
                              <span className={`da-badge ${(story.status || '').toLowerCase()}`}>
                                {(story.status || '').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                                {pipelineRuns[story.id]?.status === 'running' ? (
                                  <div 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '6px', 
                                      background: 'rgba(255, 90, 20, 0.08)', 
                                      border: '1px solid var(--da-accent)', 
                                      borderRadius: '6px', 
                                      padding: '3px 10px',
                                      fontSize: '0.75rem',
                                      color: 'var(--da-accent)',
                                      fontWeight: 600
                                    }}
                                    title="Pipeline is executing across DEVAA agents"
                                  >
                                    <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                    <span>{pipelineRuns[story.id].stage || 'Running'}...</span>
                                  </div>
                                ) : pipelineRuns[story.id]?.status === 'success' && pipelineRuns[story.id].pr_url ? (
                                  <a 
                                    href={pipelineRuns[story.id].pr_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="da-btn"
                                    style={{ 
                                      background: 'rgba(16, 185, 129, 0.1)', 
                                      color: '#059669', 
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      padding: '0.25rem 0.65rem', 
                                      fontSize: '0.75rem', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '4px',
                                      textDecoration: 'none',
                                      fontWeight: 600
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Open created Pull Request"
                                  >
                                    <CheckCircle2 size={13} color="#059669" /> PR Created <ExternalLink size={11} />
                                  </a>
                                ) : pipelineRuns[story.id]?.status === 'failed' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span 
                                      className="da-badge"
                                      style={{ 
                                        background: 'rgba(239, 68, 68, 0.1)', 
                                        color: 'var(--da-danger)', 
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        fontSize: '0.72rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title={pipelineRuns[story.id].error}
                                    >
                                      <AlertTriangle size={12} /> Failed ({pipelineRuns[story.id].stage || 'Error'})
                                    </span>
                                    <button 
                                      className="da-btn da-btn-outline" 
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRunDevaa(story.id, Boolean(story.has_rework));
                                      }}
                                      title="Retry pipeline"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : isTodo ? (
                                  <>
                                    <button 
                                      className="da-btn da-btn-outline" 
                                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditStory(story);
                                      }}
                                      title="Edit story details (Title, Priority, Story Points, Due Date, Assignee, etc.)"
                                    >
                                      <Edit3 size={13} /> Edit
                                    </button>
                                    {story.has_rework ? (
                                      <button 
                                        className="da-btn" 
                                        style={{ 
                                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                                          color: '#FFF', 
                                          border: 'none',
                                          padding: '0.25rem 0.65rem', 
                                          fontSize: '0.78rem', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '4px',
                                          fontWeight: 600,
                                          boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRunDevaa(story.id, true);
                                        }}
                                        title="Re-run Rework Pipeline — injects QA rejection feedback into agents"
                                      >
                                        <RotateCcw size={13} /> Re-run (Rework)
                                      </button>
                                    ) : (
                                      <button 
                                        className="da-btn da-btn-primary" 
                                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRunDevaa(story.id, false);
                                        }}
                                        title="Run DEVAA Pipeline"
                                      >
                                        <Play size={13} /> Run
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.25rem 0.5rem' }}>
                                    <Lock size={12} /> View Only
                                  </span>
                                )}
                              {/* Logs button — always visible */}
                              <button
                                className="da-btn da-btn-outline"
                                style={{
                                  padding: '0.25rem 0.65rem', fontSize: '0.75rem',
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  background: logsPanelStory?.id === story.id ? 'rgba(99,102,241,0.15)' : '',
                                  borderColor: logsPanelStory?.id === story.id ? '#6366f1' : '',
                                  color: logsPanelStory?.id === story.id ? '#818cf8' : '',
                                }}
                                onClick={e => { e.stopPropagation(); setLogsPanelStory(story); }}
                                title="View pipeline activity log"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                                </svg>
                                Logs
                              </button>
                            </div>
                          </td>
                          </tr>
                        );
                      })}
                  </tbody>

                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEW STORY VIEW ── */}
      {activeTab === 'new-story' && (
        <div className="da-body" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="da-section">
            <div className="da-section-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span>Create New Story</span>
              {connectorStatus?.connected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="da-badge inprogress" style={{ textTransform: 'none', fontSize: '0.78rem' }}>
                    Jira Connected: <strong>{formData.project_key || connectorStatus.project || 'Set Project Key'}</strong>
                  </span>
                  {resourcesLoading && <RefreshCw size={14} className="lucide-animated-spin" style={{ color: '#888' }} />}
                </div>
              )}
            </div>

            <form onSubmit={handleCreateStory} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="da-form-group">
                <label>Story Title *</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Implement User Authentication and Session Management"
                  required
                />
              </div>

              {/* Jira Project Key Selector */}
              {formData.sync_to_jira && (
                <div className="da-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ margin: 0 }}>Jira Project Key *</label>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                      {jiraProjects.length > 0 && (
                        <button
                          type="button"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: projectInputMode === 'select' ? 'var(--da-accent)' : '#888',
                            fontWeight: projectInputMode === 'select' ? 600 : 400
                          }}
                          onClick={() => setProjectInputMode('select')}
                        >
                          Select from Jira
                        </button>
                      )}
                      {jiraProjects.length > 0 && <span style={{ color: '#ccc' }}>|</span>}
                      <button
                        type="button"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: projectInputMode === 'manual' ? 'var(--da-accent)' : '#888',
                          fontWeight: projectInputMode === 'manual' ? 600 : 400
                        }}
                        onClick={() => setProjectInputMode('manual')}
                      >
                        Enter Key Manually
                      </button>
                    </div>
                  </div>

                  {projectInputMode === 'select' && jiraProjects.length > 0 ? (
                    <select
                      value={formData.project_key || ''}
                      onChange={e => handleProjectChange(e.target.value)}
                      required
                    >
                      <option value="">-- Select a Jira Project --</option>
                      {jiraProjects.map(p => (
                        <option key={p.key} value={p.key}>
                          {p.key} — {p.name}
                        </option>
                      ))}
                      <option value="__manual__">✏️ Enter Custom Project Key...</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={formData.project_key || ''}
                      onChange={e => setFormData({...formData, project_key: e.target.value.toUpperCase().trim()})}
                      placeholder="e.g. TEST, SCRUM, PROJ (Exact project key from your Jira URL)"
                      required={formData.sync_to_jira}
                    />
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', display: 'block' }}>
                    {jiraProjects.length > 0 
                      ? `Loaded ${jiraProjects.length} project(s) from your Jira instance.` 
                      : 'Enter the exact Project Key where this story should be created (e.g. your Jira project prefix).'}
                  </span>
                </div>
              )}

              {/* Priority, Issue Type, Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="da-form-group">
                  <label>Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="Highest">Highest</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Lowest">Lowest</option>
                  </select>
                </div>

                <div className="da-form-group">
                  <label>Issue Type</label>
                  <select 
                    value={formData.issue_type}
                    onChange={e => setFormData({...formData, issue_type: e.target.value})}
                  >
                    <option value="Story">Story</option>
                    <option value="Task">Task</option>
                    <option value="Bug">Bug</option>
                  </select>
                </div>

                <div className="da-form-group">
                  <label>Initial Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="TO-DO">To Do</option>
                    <option value="IN-PROGRESS">In Progress</option>
                  </select>
                </div>
              </div>

              {/* Start Date, Due Date & Sprint Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="da-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> Start Date
                  </label>
                  <input 
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', display: 'block' }}>
                    Automatically set to today's creation date.
                  </span>
                </div>

                <div className="da-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> Due Date
                  </label>
                  <input 
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', display: 'block' }}>
                    Target resolution or release date.
                  </span>
                </div>

                <div className="da-form-group">
                  <label>Sprint Destination</label>
                  <select 
                    value={formData.sprint_id}
                    onChange={e => setFormData({...formData, sprint_id: e.target.value})}
                  >
                    <option value="active">⚡ Current Active Sprint (e.g. SCRUM Sprint 0) [Recommended]</option>
                    {jiraSprints.length > 0 && jiraSprints.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.state === 'active' ? '● (Active Board)' : '(Future)'}
                      </option>
                    ))}
                    <option value="backlog">📦 Backlog (Do not add to sprint)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', display: 'block' }}>
                    Active Sprint items immediately show on your Jira <strong>Board</strong>.
                  </span>
                </div>
              </div>

              {/* Story Point Estimate & Labels Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="da-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                      <Hash size={14} /> Story Point Estimate
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 5, 8, 13].map(pts => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setFormData({...formData, story_points: pts.toString()})}
                          style={{
                            background: formData.story_points === pts.toString() ? 'var(--da-accent)' : 'var(--da-surface-2)',
                            color: formData.story_points === pts.toString() ? '#FFF' : 'var(--da-text)',
                            border: '1px solid var(--da-border-orange)',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {pts}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input 
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.story_points}
                    onChange={e => setFormData({...formData, story_points: e.target.value})}
                    placeholder="e.g. 1, 2, 3, 5, 8, 13..."
                    style={{ marginTop: '4px' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', display: 'block' }}>
                    Fibonacci estimation points for sprint capacity planning.
                  </span>
                </div>

                <div className="da-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={14} /> Labels / Tags
                  </label>
                  <input 
                    type="text"
                    value={formData.labels}
                    onChange={e => setFormData({...formData, labels: e.target.value})}
                    placeholder="e.g. frontend, backend, security, bug"
                  />
                  <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', display: 'block' }}>
                    Comma-separated tags to categorize this issue in Jira.
                  </span>
                </div>
              </div>

              {/* Assignee Details (Dropdown + Manual Input) */}
              <div className="da-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '4px' }}>
                  <label style={{ margin: 0 }}>Assignee Details</label>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                    <button 
                      type="button" 
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: assigneeSelectValue !== '__manual__' ? 'var(--da-accent)' : '#888',
                        fontWeight: assigneeSelectValue !== '__manual__' ? 600 : 400
                      }}
                      onClick={() => setAssigneeSelectValue('')}
                    >
                      Jira User Dropdown
                    </button>
                    <span style={{ color: '#ccc' }}>|</span>
                    <button 
                      type="button" 
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: assigneeSelectValue === '__manual__' ? 'var(--da-accent)' : '#888',
                        fontWeight: assigneeSelectValue === '__manual__' ? 600 : 400
                      }}
                      onClick={() => setAssigneeSelectValue('__manual__')}
                    >
                      Manual Name / Email
                    </button>
                  </div>
                </div>

                {assigneeSelectValue !== '__manual__' ? (
                  <select 
                    value={assigneeSelectValue}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__manual__') {
                        setAssigneeSelectValue('__manual__');
                      } else {
                        setAssigneeSelectValue(val);
                      }
                    }}
                  >
                    <option value="">-- Unassigned --</option>
                    {jiraUsers.length > 0 && (
                      <optgroup label="Jira Users">
                        {jiraUsers.map(u => (
                          <option key={u.accountId} value={u.accountId}>
                            {u.displayName} {u.emailAddress ? `(${u.emailAddress})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__manual__">✏️ Enter Custom Name / Email manually...</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={manualAssigneeText}
                      onChange={e => setManualAssigneeText(e.target.value)}
                      placeholder="e.g. dev@company.com or username"
                      autoFocus
                    />
                    <button 
                      type="button" 
                      className="da-btn da-btn-ghost" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      onClick={() => setAssigneeSelectValue('')}
                    >
                      Use Dropdown
                    </button>
                  </div>
                )}
                <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', display: 'block' }}>
                  {assigneeSelectValue !== '__manual__'
                    ? (jiraUsers.length > 0 
                        ? `${jiraUsers.length} user(s) loaded from Jira. Choose a user or switch to manual input.`
                        : 'Select Unassigned or switch to manual name/email entry.')
                    : 'DEVAA will query Jira using this name/email to resolve the Atlassian Account ID.'}
                </span>
              </div>

              {/* Description */}
              <div className="da-form-group">
                <label>Description *</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  placeholder="Detailed background, user story requirements, or problem statement..."
                  required
                />
              </div>

              {/* Acceptance Criteria */}
              <div className="da-form-group">
                <label>Acceptance Criteria</label>
                <textarea 
                  value={formData.acceptance_criteria}
                  onChange={e => setFormData({...formData, acceptance_criteria: e.target.value})}
                  rows={3}
                  placeholder="- User must be able to log in with email/password&#10;- Return 401 on invalid credentials&#10;- Session expires after 24 hours"
                />
              </div>

              {/* Attachments Upload Section */}
              <div className="da-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Paperclip size={15} /> Attachments
                    {selectedFiles.length > 0 && (
                      <span className="da-badge default" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                        {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </label>
                  {selectedFiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      style={{ background: 'none', border: 'none', color: 'var(--da-danger)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} /> Clear all
                    </button>
                  )}
                </div>

                {/* Dropzone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: dragActive ? '2px dashed var(--da-accent)' : '2px dashed var(--da-border-orange)',
                    background: dragActive ? 'rgba(255, 90, 20, 0.08)' : 'var(--da-surface-2)',
                    borderRadius: 'var(--da-radius)',
                    padding: '1.25rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => {
                      handleFileSelect(e.target.files);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'rgba(255, 90, 20, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--da-accent)'
                    }}>
                      <UploadCloud size={20} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1f2937' }}>
                      Drag & drop files here, or <span style={{ color: 'var(--da-accent)', textDecoration: 'underline' }}>browse</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      Supports images, screenshots, PDFs, logs, docs, and ZIP files. Directly uploads to Jira issue attachments.
                    </div>
                  </div>
                </div>

                {/* Attached Files List */}
                {selectedFiles.length > 0 && (
                  <div style={{
                    marginTop: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.8rem',
                          background: '#FFFFFF',
                          border: '1px solid var(--da-border)',
                          borderRadius: 'var(--da-radius-sm)',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <Paperclip size={14} style={{ color: 'var(--da-accent)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: '#1f2937', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <span style={{ color: '#888', fontSize: '0.72rem', flexShrink: 0 }}>
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#999',
                            padding: '3px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Remove file"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              {/* Jira Direct Push Toggle Card */}
              <div style={{
                background: 'var(--da-surface-2)',
                border: '1px solid var(--da-border-orange)',
                borderRadius: 'var(--da-radius-sm)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem'
              }}>
                <input 
                  type="checkbox" 
                  id="sync_jira_chk"
                  checked={formData.sync_to_jira}
                  onChange={e => setFormData({...formData, sync_to_jira: e.target.checked})}
                  style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--da-accent)' }}
                />
                <label htmlFor="sync_jira_chk" style={{ cursor: 'pointer', margin: 0, textTransform: 'none', color: 'var(--da-text)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--da-text)' }}>
                    Push & Create directly in Jira Cloud
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                    Creates a new Jira issue with all above fields (Project: <strong>{formData.project_key || 'specified key'}</strong>), links the generated key, and displays it in DEVAA.
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="da-btn da-btn-ghost" 
                  onClick={() => setActiveTab('dashboard')}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="da-btn da-btn-primary"
                  disabled={creating}
                >
                  {creating ? (
                    <><RefreshCw size={16} className="lucide-animated-spin" /> Creating Story...</>
                  ) : (
                    <><Plus size={16} /> Create Story</>
                  )}
                </button>
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

      {/* ── STORY DETAIL MODAL ── */}
      {selectedStory && (
        <div 
          className="da-modal-overlay" 
          onClick={() => setSelectedStory(null)}
          style={{ zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div 
            className="da-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--da-surface)',
              borderRadius: 'var(--da-radius)',
              maxWidth: '750px',
              width: '95%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
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
                  {selectedStory.jira_story_key && (
                    <span className="da-badge default" style={{ fontSize: '0.8rem', fontWeight: 700, border: '1px solid var(--da-border)' }}>
                      {selectedStory.jira_story_key}
                    </span>
                  )}
                  <span className={`da-badge ${(selectedStory.status || '').toLowerCase()}`}>
                    {(selectedStory.status || '').toUpperCase()}
                  </span>
                  {selectedStory.external_provider && (
                    <span className="da-badge" style={{ background: 'rgba(255, 90, 20, 0.1)', color: 'var(--da-accent)', border: '1px solid var(--da-border-orange)' }}>
                      {selectedStory.external_provider.toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937', fontWeight: 700 }}>
                  {selectedStory.title}
                </h3>
              </div>
              <button 
                className="da-btn da-btn-ghost" 
                onClick={() => setSelectedStory(null)}
                style={{ padding: '6px 8px', borderRadius: 'var(--da-radius-sm)', color: 'var(--da-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Meta Grid */}
            <div style={{
              padding: '1rem 1.5rem',
              background: '#FFFFFF',
              borderBottom: '1px solid var(--da-border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                  ASSIGNEE
                </span>
                <strong style={{ color: '#1f2937' }}>
                  {selectedStory.repository_details?.[0]?.external_assignee || 'Unassigned'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                  BRANCH
                </span>
                <code style={{ 
                  background: 'var(--da-surface-2)', 
                  padding: '3px 8px', 
                  borderRadius: '4px', 
                  color: 'var(--da-accent)', 
                  border: '1px solid var(--da-border-orange)', 
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  {selectedStory.source_branch || selectedStory.current_branch || 'main'}
                </code>
              </div>
              {selectedStory.repository_details?.[0]?.story_points && (
                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    STORY POINTS
                  </span>
                  <span className="da-badge" style={{ background: 'rgba(255, 90, 20, 0.1)', color: 'var(--da-accent)', border: '1px solid var(--da-border-orange)', fontWeight: 700 }}>
                    {selectedStory.repository_details[0].story_points} pts
                  </span>
                </div>
              )}
              {selectedStory.repository_details?.[0]?.due_date && (
                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    DUE DATE
                  </span>
                  <span style={{ color: '#1f2937', fontWeight: 600 }}>
                    {selectedStory.repository_details[0].due_date}
                  </span>
                </div>
              )}
              {selectedStory.repository_details?.[0]?.labels && (
                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    LABELS
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {String(selectedStory.repository_details[0].labels).split(',').map((lbl, i) => (
                      <span key={i} className="da-badge default" style={{ fontSize: '0.72rem' }}>
                        #{lbl.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedStory.created_at && (
                <div>
                  <span style={{ color: 'var(--da-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>
                    CREATED AT
                  </span>
                  <span style={{ color: 'var(--da-text)' }}>
                    {new Date(selectedStory.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable Description Body */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              background: '#FFFFFF'
            }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--da-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Description & Requirements
                </h4>
                <div style={{
                  background: 'var(--da-surface-2)',
                  padding: '1.25rem',
                  borderRadius: 'var(--da-radius-sm)',
                  border: '1px solid var(--da-border)',
                  fontSize: '0.88rem',
                  lineHeight: 1.65,
                  color: '#2d3748',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  wordBreak: 'break-word'
                }}>
                  {selectedStory.description || 'No description provided.'}
                </div>
              </div>

              {selectedStory.acceptance_criteria && (
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
                    {selectedStory.acceptance_criteria}
                  </div>
                </div>
              )}

              {/* Attachments Section in Modal */}
              {selectedStory.repository_details?.[0]?.attachments?.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--da-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} /> Attachments ({selectedStory.repository_details[0].attachments.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedStory.repository_details[0].attachments.map((att, attIdx) => (
                      <div
                        key={attIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.85rem',
                          background: 'var(--da-surface-2)',
                          border: '1px solid var(--da-border)',
                          borderRadius: 'var(--da-radius-sm)',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Paperclip size={14} style={{ color: 'var(--da-accent)' }} />
                          <span style={{ fontWeight: 600, color: '#1f2937' }}>
                            {att.filename || `Attachment ${attIdx + 1}`}
                          </span>
                          {att.size && (
                            <span style={{ color: '#888', fontSize: '0.72rem' }}>
                              ({formatFileSize(att.size)})
                            </span>
                          )}
                        </div>
                        {att.jira_synced && (
                          <span className="da-badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--da-success)', border: '1px solid var(--da-success)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} /> Jira Attached
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* QA Approval Notice for DONE stories */}
              {((selectedStory.status || '').toUpperCase() === 'DONE') && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.06)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '6px',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <CheckCircle2 size={20} color="var(--da-success)" />
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--da-success)', fontSize: '0.85rem', display: 'block' }}>
                      QA Approved & Merged
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>
                      This story was verified against acceptance criteria and approved by QA. PR merged to target branch.
                    </span>
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
              gap: '0.75rem'
            }}>
              <button
                className="da-btn da-btn-outline"
                style={{ borderColor: 'var(--da-border-orange)', color: 'var(--da-accent)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
                onClick={() => {
                  setLogsPanelStory(selectedStory);
                }}
              >
                View Pipeline Logs
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="da-btn da-btn-ghost" onClick={() => setSelectedStory(null)}>
                  Close
                </button>
              <button 
                className="da-btn da-btn-primary"
                style={selectedStory?.has_rework ? {
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
                } : {}}
                onClick={() => {
                  const id = selectedStory.id;
                  const hasRework = Boolean(selectedStory.has_rework);
                  setSelectedStory(null);
                  handleRunDevaa(id, hasRework);
                }}
                disabled={(selectedStory.status || '').toLowerCase().replace('-', '') !== 'todo' || pipelineRuns[selectedStory.id]?.status === 'running'}
              >
                {selectedStory?.has_rework ? (
                  <><RotateCcw size={14} /> Re-run (Rework)</>
                ) : (
                  <><Play size={14} /> Run DEVAA Pipeline</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── EDIT STORY MODAL (Only for TO-DO stories) ── */}
      {editingStory && (
        <div 
          className="da-modal-overlay" 
          onClick={() => setEditingStory(null)}
          style={{ zIndex: 1100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div 
            className="da-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--da-surface)',
              borderRadius: 'var(--da-radius)',
              maxWidth: '650px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 45px rgba(0,0,0,0.22)',
              border: '1px solid var(--da-border-orange)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--da-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--da-surface-2)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="da-badge default" style={{ fontWeight: 700 }}>
                    {editingStory.jira_story_key || `Story #${editingStory.id}`}
                  </span>
                  <span className="da-badge todo">TO-DO</span>
                </div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', color: '#1f2937', fontWeight: 700 }}>
                  Edit Story Details
                </h3>
              </div>
              <button 
                className="da-btn da-btn-ghost" 
                onClick={() => setEditingStory(null)}
                style={{ padding: '6px 8px', color: 'var(--da-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="da-form-group">
                  <label>Story Title *</label>
                  <input 
                    type="text"
                    value={editFormData.title}
                    onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                  <div className="da-form-group">
                    <label>Priority</label>
                    <select 
                      value={editFormData.priority}
                      onChange={e => setEditFormData({...editFormData, priority: e.target.value})}
                    >
                      <option value="Highest">Highest</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Lowest">Lowest</option>
                    </select>
                  </div>

                  <div className="da-form-group">
                    <label>Story Points</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.5"
                      value={editFormData.story_points}
                      onChange={e => setEditFormData({...editFormData, story_points: e.target.value})}
                      placeholder="e.g. 1, 2, 3, 5, 8"
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      {['1', '2', '3', '5', '8', '13'].map(pts => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setEditFormData({...editFormData, story_points: pts})}
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            borderRadius: '4px',
                            border: String(editFormData.story_points) === pts ? '1px solid var(--da-accent)' : '1px solid var(--da-border)',
                            background: String(editFormData.story_points) === pts ? 'rgba(255, 90, 20, 0.12)' : '#fff',
                            color: String(editFormData.story_points) === pts ? 'var(--da-accent)' : '#475569',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {pts}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="da-form-group">
                    <label>Due Date</label>
                    <input 
                      type="date"
                      value={editFormData.due_date}
                      onChange={e => setEditFormData({...editFormData, due_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="da-form-group">
                  <label>Labels / Tags</label>
                  <input 
                    type="text"
                    value={editFormData.labels}
                    onChange={e => setEditFormData({...editFormData, labels: e.target.value})}
                    placeholder="e.g. frontend, backend, bug (comma-separated)"
                  />
                </div>

                <div className="da-form-group">
                  <label>Assignee</label>
                  {jiraUsers && jiraUsers.length > 0 ? (
                    <select
                      value={editFormData.assignee_account_id || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const matched = jiraUsers.find(u => u.accountId === val);
                        setEditFormData({
                          ...editFormData,
                          assignee_account_id: val,
                          assignee: matched ? (matched.displayName || matched.emailAddress) : val
                        });
                      }}
                    >
                      <option value="">-- Select Assignee --</option>
                      {jiraUsers.map(u => (
                        <option key={u.accountId} value={u.accountId}>
                          {u.displayName} {u.emailAddress ? `(${u.emailAddress})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text"
                      value={editFormData.assignee}
                      onChange={e => setEditFormData({...editFormData, assignee: e.target.value})}
                      placeholder="e.g. name or email address"
                    />
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px', display: 'block' }}>
                    {editFormData.assignee ? `Assigned to: ${editFormData.assignee}` : 'Unassigned'}
                  </span>
                </div>


                <div className="da-form-group">
                  <label>Description</label>
                  <textarea 
                    rows={4}
                    value={editFormData.description}
                    onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                    placeholder="Updated description or requirements..."
                  />
                </div>

                <div className="da-form-group">
                  <label>Acceptance Criteria</label>
                  <textarea 
                    rows={3}
                    value={editFormData.acceptance_criteria}
                    onChange={e => setEditFormData({...editFormData, acceptance_criteria: e.target.value})}
                    placeholder="Updated acceptance criteria..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--da-border)',
                background: 'var(--da-surface-2)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button 
                  type="button"
                  className="da-btn da-btn-ghost" 
                  onClick={() => setEditingStory(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="da-btn da-btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <><RefreshCw size={14} className="lucide-animated-spin" /> Saving Changes...</>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
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
    </DashboardLayout>
  );
}
