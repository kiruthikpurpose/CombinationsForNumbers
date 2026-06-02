import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);
    return apiClient.post('/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  register: (data: { email: string; full_name: string; password: string; role?: string }) =>
    apiClient.post('/auth/register', data),
  me: () => apiClient.get('/auth/me'),
};

export const documentsApi = {
  upload: (file: File, domain?: string, tags?: string, onProgress?: (p: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    if (domain) form.append('domain', domain);
    if (tags) form.append('tags', tags);
    return apiClient.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
  list: (params?: { page?: number; page_size?: number; status_filter?: string; domain?: string; search?: string }) =>
    apiClient.get('/documents/', { params }),
  get: (id: string) => apiClient.get(`/documents/${id}`),
  delete: (id: string) => apiClient.delete(`/documents/${id}`),
  sections: (id: string) => apiClient.get(`/documents/${id}/sections`),
  entities: (id: string, entityType?: string) =>
    apiClient.get(`/documents/${id}/entities`, { params: { entity_type: entityType } }),
  reprocess: (id: string) => apiClient.post(`/documents/${id}/reprocess`),
};

export const knowledgeApi = {
  search: (query: string, options?: {
    document_ids?: string[];
    unit_types?: string[];
    top_k?: number;
    min_score?: number;
  }) => apiClient.post('/knowledge/search', { query, ...options }),
  listUnits: (params?: { document_id?: string; unit_type?: string; page?: number; page_size?: number }) =>
    apiClient.get('/knowledge/units', { params }),
  getUnit: (id: string) => apiClient.get(`/knowledge/units/${id}`),
  validateUnit: (id: string) => apiClient.post(`/knowledge/units/${id}/validate`),
  stats: () => apiClient.get('/knowledge/stats/summary'),
};

export const reasoningApi = {
  query: (params: {
    query: string;
    document_ids?: string[];
    reasoning_depth?: string;
    output_format?: string;
    include_evidence?: boolean;
  }) => apiClient.post('/reasoning/query', params),
  history: (params?: { page?: number; page_size?: number; intent_filter?: string }) =>
    apiClient.get('/reasoning/history', { params }),
  getQuery: (id: string) => apiClient.get(`/reasoning/${id}`),
  feedback: (query_id: string, feedback: string, note?: string) =>
    apiClient.post('/reasoning/feedback', { query_id, feedback, note }),
};

export const agentsApi = {
  create: (data: { name: string; description: string; source_document_ids: string[]; auto_extract?: boolean }) =>
    apiClient.post('/agents/', data),
  list: (params?: { status_filter?: string; page?: number; page_size?: number }) =>
    apiClient.get('/agents/', { params }),
  get: (id: string) => apiClient.get(`/agents/${id}`),
  deploy: (id: string) => apiClient.post(`/agents/${id}/deploy`),
  delete: (id: string) => apiClient.delete(`/agents/${id}`),
};

export const reportsApi = {
  create: (data: {
    title: string;
    report_type: string;
    document_ids: string[];
    query_id?: string;
    include_evidence?: boolean;
    format?: string;
  }) => apiClient.post('/reports/', data),
  list: (params?: { report_type?: string; page?: number; page_size?: number }) =>
    apiClient.get('/reports/', { params }),
  get: (id: string) => apiClient.get(`/reports/${id}`),
  delete: (id: string) => apiClient.delete(`/reports/${id}`),
};

export const adminApi = {
  stats: () => apiClient.get('/admin/stats'),
  users: (params?: { page?: number; page_size?: number }) => apiClient.get('/admin/users', { params }),
  auditLogs: (params?: { page?: number; page_size?: number }) =>
    apiClient.get('/admin/audit-logs', { params }),
};
