// src/api.js
//
// One place that knows how to talk to the backend. Every function here
// returns a parsed JSON response, or throws an Error with a readable
// message (pulled from the backend's { error: "..." } responses) that
// components can catch and show in a toast.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'studyhub_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err) {
    throw new Error('Could not reach the server — is the backend running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const api = {
  // auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // resources
  listResources: (query = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([, v]) => v)));
    const qs = params.toString();
    return request(`/resources${qs ? `?${qs}` : ''}`);
  },
  getResource: (id) => request(`/resources/${id}`),
  createResource: (body) => request('/resources', { method: 'POST', body: JSON.stringify(body) }),
  deleteResource: (id) => request(`/resources/${id}`, { method: 'DELETE' }),
  upvoteResource: (id) => request(`/resources/${id}/upvote`, { method: 'POST' }),
  commentOnResource: (id, text) => request(`/resources/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),

  // requests board
  listRequests: () => request('/requests'),
  getRequest: (id) => request(`/requests/${id}`),
  createRequest: (body) => request('/requests', { method: 'POST', body: JSON.stringify(body) }),
  toggleFulfilled: (id) => request(`/requests/${id}/fulfilled`, { method: 'PATCH' }),
  commentOnRequest: (id, text) => request(`/requests/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),

  // leaderboard + bookmarks
  leaderboard: () => request('/leaderboard'),
  bookmarks: () => request('/bookmarks'),
  toggleBookmark: (resourceId) => request(`/bookmarks/${resourceId}`, { method: 'POST' }),

  // admin dashboard (requires an admin account)
  adminStats: () => request('/admin/stats'),
  adminUsers: () => request('/admin/users'),
  adminEvents: (query = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([, v]) => v)));
    const qs = params.toString();
    return request(`/admin/events${qs ? `?${qs}` : ''}`);
  },

  // File upload — sends multipart/form-data (PDF, images, Word docs) to S3 via the backend.
  // Returns { url, key, originalName, mimeType, sizeBytes }
  uploadFile: (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      // No Content-Type header — the browser sets it automatically with the correct boundary
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      return data;
    });
  }
};
