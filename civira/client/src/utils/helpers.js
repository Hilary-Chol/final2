// Utility helper functions used across the app

export function toKeywords(value) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function hasDeadlinePassed(value) {
  if (!value) return false;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return false;
  deadline.setHours(23, 59, 59, 999);
  return Date.now() > deadline.getTime();
}

export function parseSkillList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function profileImageFromName(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Profile')}&background=1f5fa8&color=ffffff&rounded=true&size=128`;
}

export function profileBio(candidate) {
  const location = candidate.location || 'Location not provided';
  const experience = candidate.experience_level || 'experience level not specified';
  return `Based in ${location}. Has ${experience} background and is available for team collaboration.`;
}

export const pageToPath = {
  landing: '/',
  login: '/login',
  'applicant-login': '/applicant/login',
  'applicant-register': '/applicant/register',
  'org-login': '/organization/login',
  'org-register': '/organization/register',
  'panelist-register': '/panelist/register',
  'applicant-dashboard': '/applicant/dashboard',
  'applicant-browse': '/applicant/jobs',
  'applicant-apply': '/applicant/apply',
  'applicant-profile': '/applicant/profile',
  'admin-dashboard': '/manager/dashboard',
  'admin-jobs': '/manager/jobs',
  'admin-job-details': '/manager/jobs/details',
  'admin-shortlist': '/manager/shortlist',
  'admin-interviews': '/manager/interviews',
  'admin-team': '/manager/team',
  'admin-profile': '/manager/profile',
  'panelist-dashboard': '/member/dashboard',
  'panelist-scoring': '/member/scoring',
  'panelist-profile': '/member/profile'
};

export function pathToPage(pathname) {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  const match = Object.entries(pageToPath).find(([, path]) => path === normalized);
  return match ? match[0] : 'landing';
}
