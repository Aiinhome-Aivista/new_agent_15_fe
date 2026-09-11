import axios from 'axios';
import { clearAllStorage } from '../utils/storage';

// ── Axios client with auto JWT injection ──────────────────────────────────────
const apiClient = axios.create();

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAllStorage();
    }
    return Promise.reject(error);
  }
);

// ── Workflows (existing) ──────────────────────────────────────────────────────
export const fetchWorkflows = async () => {
  const r = await apiClient.get('/api/workflows/');
  return r.data;
};
export const fetchWorkflowDetails = async (id) => {
  const r = await apiClient.get(`/api/workflows/${id}`);
  return r.data;
};
export const initiateWorkflow = async (payload) => {
  const r = await apiClient.post('/api/workflows/initiate', payload);
  return r.data;
};

// ── Stories ───────────────────────────────────────────────────────────────────
export const fetchStories = async () => {
  const r = await apiClient.get('/api/stories/');
  return r.data;
};
export const fetchStory = async (id) => {
  const r = await apiClient.get(`/api/stories/${id}`);
  return r.data;
};
export const createStory = async (payload) => {
  const r = await apiClient.post('/api/stories/', payload);
  return r.data;
};
export const uploadStoryAttachments = async (storyId, formData) => {
  const r = await apiClient.post(`/api/stories/${storyId}/attachments`, formData);
  return r.data;
};

export const syncTasks = async () => {
  const r = await apiClient.post('/api/stories/sync');
  return r.data;
};
export const updateStory = async (id, payload) => {
  const r = await apiClient.put(`/api/stories/${id}`, payload);
  return r.data;
};
export const triggerRun = async (storyId) => {
  const r = await apiClient.post(`/api/stories/${storyId}/run`);
  return r.data;
};
export const fetchStoryStatus = async (id) => {
  const r = await apiClient.get(`/api/stories/${id}/status`);
  return r.data;
};

// ── Pull Requests ─────────────────────────────────────────────────────────────
export const fetchPullRequests = async () => {
  const r = await apiClient.get('/api/pull-requests/');
  return r.data;
};
export const fetchPullRequest = async (id) => {
  const r = await apiClient.get(`/api/pull-requests/${id}`);
  return r.data;
};
export const approvePR = async (id, comments = '') => {
  const r = await apiClient.post(`/api/pull-requests/${id}/approve`, { comments });
  return r.data;
};
export const rejectPR = async (id, comments) => {
  const r = await apiClient.post(`/api/pull-requests/${id}/reject`, { comments });
  return r.data;
};

// ── QA ────────────────────────────────────────────────────────────────────────
export const fetchQAQueue = async () => {
  const r = await apiClient.get('/api/qa/queue');
  return r.data;
};
export const fetchQAApproved = async () => {
  const r = await apiClient.get('/api/qa/approved');
  return r.data;
};
export const submitQADecision = async (storyId, decision, comments = '') => {
  const r = await apiClient.post(`/api/qa/${storyId}/decision`, { decision, comments });
  return r.data;
};
export const fetchPipelineLogs = async (storyId, sinceId = 0) => {
  const r = await apiClient.get(`/api/stories/${storyId}/pipeline-logs`, {
    params: { since: sinceId }
  });
  return r.data;
};
export const triggerRework = async (storyId) => {
  const r = await apiClient.post(`/api/qa/${storyId}/rework`);
  return r.data;
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const fetchAdminMetrics = async () => {
  const r = await apiClient.get('/api/admin/metrics');
  return r.data;
};
export const fetchAuditLogs = async (params = {}) => {
  const r = await apiClient.get('/api/admin/audit-logs', { params });
  return r.data;
};
export const fetchGuardrailEvents = async (params = {}) => {
  const r = await apiClient.get('/api/admin/guardrail-events', { params });
  return r.data;
};
export const fetchAllWorkflows = async () => {
  const r = await apiClient.get('/api/admin/workflows');
  return r.data;
};
export const fetchWorkflowSteps = async (workflowId) => {
  const r = await apiClient.get(`/api/admin/workflows/${workflowId}/steps`);
  return r.data;
};
export const fetchUsers = async () => {
  const r = await apiClient.get('/api/admin/users');
  return r.data;
};

// ── Connectors ─────────────────────────────────────────────────────────────────
export const fetchConnectorStatus = async () => {
  const r = await apiClient.get('/api/connectors/status');
  return r.data;
};
export const fetchJiraResources = async (projectKey = '') => {
  const r = await apiClient.get('/api/connectors/jira/resources', {
    params: projectKey ? { project_key: projectKey } : {}
  });
  return r.data;
};
export const testGithubConnection = async () => {
  const r = await apiClient.post('/api/connectors/github/test');
  return r.data;
};

export default apiClient;
