const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders(path = '') {
  const applicantToken = localStorage.getItem('applicant_token') || localStorage.getItem('civira_applicant_token');
  const orgToken = localStorage.getItem('auth_token') || localStorage.getItem('civira_token');

  const applicantPaths = [
    '/applicants',
    '/candidates/apply',
    '/candidates/my-applications'
  ];

  const prefersApplicantToken = applicantPaths.some((prefix) => path.startsWith(prefix));
  const token = prefersApplicantToken ? (applicantToken || orgToken) : (orgToken || applicantToken);

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeOptions(methodOrOptions = {}, maybeBody) {
  if (typeof methodOrOptions === 'string') {
    const method = methodOrOptions.toUpperCase();
    const body = maybeBody;
    const hasBody = body !== undefined && body !== null;
    return {
      method,
      ...(hasBody ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {})
    };
  }

  return methodOrOptions || {};
}

export async function apiRequest(path, methodOrOptions = {}, maybeBody) {
  const options = normalizeOptions(methodOrOptions, maybeBody);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(path),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw || 'Invalid response from server' };
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export { API_BASE_URL };
