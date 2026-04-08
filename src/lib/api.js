import { getApiBaseUrl, getToken } from './auth.js';

function joinUrl(path) {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch(path, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    auth = true,
    ...rest
  } = options;

  const requestHeaders = { ...headers };
  const token = getToken();

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    requestBody = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(joinUrl(path), {
    method,
    headers: requestHeaders,
    body: requestBody,
    ...rest,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' && data?.error
      ? data.error
      : `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, options = {}) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiFetch(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => apiFetch(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => apiFetch(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => apiFetch(path, { ...options, method: 'DELETE' }),
};
