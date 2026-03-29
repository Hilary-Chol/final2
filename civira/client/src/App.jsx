import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest, API_BASE_URL } from './services/api';
import {
  toKeywords,
  hasDeadlinePassed,
  parseSkillList,
  profileImageFromName,
  profileBio,
  pageToPath,
  pathToPage
} from './utils/helpers';
import GuestRoutes from './components/guest/GuestRoutes';
import ApplicantApp from './components/applicant/ApplicantApp';
import AdminApp from './components/admin/AdminApp';
import PanelistApp from './components/panelist/PanelistApp';
import { applicantPages, managerPages, memberPages, guestPages } from './constants/pageGroups';

// Professional role-based recruitment application
// Supports: Applicants (job seekers), managers (organization), team members (interviewers)

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 22C20 18.6863 16.4183 16 12 16C7.58172 16 4 18.6863 4 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ===== AUTHENTICATION STATE =====
  const [applicantToken, setApplicantToken] = useState(localStorage.getItem('applicant_token') || '');
  const [orgToken, setOrgToken] = useState(localStorage.getItem('auth_token') || '');

  const [applicant, setApplicant] = useState(() => {
    const stored = localStorage.getItem('applicant_data');
    return stored ? JSON.parse(stored) : null;
  });

  const [orgUser, setOrgUser] = useState(() => {
    const stored = localStorage.getItem('org_user_data');
    return stored ? JSON.parse(stored) : null;
  });

  // Account type detection
  const isApplicant = !!applicantToken && !!applicant;
  const isOrgUser = !!orgToken && !!orgUser;
  const isAdmin = orgUser?.role === 'admin';
  const isPanelist = orgUser?.role === 'panelist';

  // ===== PAGE & UI STATE =====
  const [currentPage, setCurrentPageState] = useState(() => pathToPage(location.pathname));
  const hasEnforcedGuestLanding = useRef(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [cvRating, setCvRating] = useState(null);

  // ===== DATA STATE =====
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobRankingList, setJobRankingList] = useState([]);
  const [rankingExpanded, setRankingExpanded] = useState(null);

  // ===== APPLICANT FORMS =====
  const [applicantRegisterForm, setApplicantRegisterForm] = useState({
    fullName: '', email: '', phone: '', location: ''
  });
  const [applicantLoginForm, setApplicantLoginForm] = useState({ email: '', password: '' });
  const [applicationForm, setApplicationForm] = useState({ jobId: '' });
  const [profileForm, setProfileForm] = useState({ phone: '', location: '', experienceLevel: 'entry', skills: '' });
  const [profileResume, setProfileResume] = useState(null);

  // ===== ORG FORMS =====
  const [orgRegisterForm, setOrgRegisterForm] = useState({
    organizationName: '', managerName: '', managerEmail: '', managerPassword: ''
  });
  const [orgLoginForm, setOrgLoginForm] = useState({ email: '', password: '' });
  const [jobForm, setJobForm] = useState({ title: '', description: '', criteria_keywords: '', applicationDeadline: '' });
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberCandidates, setMemberCandidates] = useState([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [topCandidates, setTopCandidates] = useState([]);
  const [panelJobId, setPanelJobId] = useState('');
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [orgProfileForm, setOrgProfileForm] = useState({ fullName: '', bio: '', experience: '', skills: '' });
  const [orgProfileCv, setOrgProfileCv] = useState(null);
  const [orgProfileMeta, setOrgProfileMeta] = useState({ cvFileName: null, userCode: '' });
  const [interviewSession, setInterviewSession] = useState(null);
  const [drawnCandidate, setDrawnCandidate] = useState(null);

  // ===== EFFECTS =====
  useEffect(() => {
    fetchJobs();
  }, [applicantToken, orgToken]);

  useEffect(() => {
    const nextPage = pathToPage(location.pathname);
    setCurrentPageState(nextPage);
  }, [location.pathname]);

  useEffect(() => {
    setMessage('');
    setSuccess(false);
  }, [currentPage]);

  useEffect(() => {
    if (hasEnforcedGuestLanding.current) return;
    hasEnforcedGuestLanding.current = true;

    if (!isApplicant && !isOrgUser && location.pathname !== pageToPath.landing) {
      setCurrentPageState('landing');
      navigate(pageToPath.landing, { replace: true });
    }
  }, [isApplicant, isOrgUser, location.pathname, navigate]);

  useEffect(() => {
    if (isApplicant && !applicantPages.includes(currentPage)) {
      setCurrentPage('applicant-dashboard');
      return;
    }

    if (isAdmin && !managerPages.includes(currentPage)) {
      setCurrentPage('admin-dashboard');
      return;
    }

    if (isPanelist && !memberPages.includes(currentPage)) {
      setCurrentPage('panelist-dashboard');
      return;
    }

    if (!isApplicant && !isOrgUser && !guestPages.includes(currentPage)) {
      setCurrentPage('landing');
    }
  }, [currentPage, isApplicant, isAdmin, isOrgUser, isPanelist]);

  useEffect(() => {
    if (isApplicant) {
      fetchApplications();
    }
  }, [applicantToken]);

  useEffect(() => {
    if (isApplicant && applicant) {
      setProfileForm({
        phone: applicant.phone || '',
        location: applicant.location || '',
        experienceLevel: applicant.experienceLevel || 'entry',
        skills: Array.isArray(applicant.skills) ? applicant.skills.join(', ') : ''
      });
    }
  }, [applicantToken, applicant]);

  useEffect(() => {
    if (isAdmin && currentPage === 'admin-team') {
      fetchTeamMembers();
      handleSearchMemberProfiles();
    }
  }, [isAdmin, currentPage]);

  useEffect(() => {
    if ((isAdmin && currentPage === 'admin-profile') || (isPanelist && currentPage === 'panelist-profile')) {
      fetchMyOrgProfile();
    }
  }, [isAdmin, isPanelist, currentPage]);

  useEffect(() => {
    if (!isAdmin || currentPage !== 'admin-team') return;
    const timer = setTimeout(() => {
      handleSearchMemberProfiles();
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearchQuery]);

  // ===== API CALLS =====
  async function fetchJobs() {
    try {
      const data = await apiRequest(isOrgUser ? '/jobs' : '/jobs/public');
      setJobs(data || []);
    } catch (error) {
      console.error('Failed to fetch jobs');
    }
  }

  async function fetchApplications() {
    if (!applicantToken) return;
    try {
      const data = await apiRequest('/candidates/my-applications');
      setMyApplications(data || []);
    } catch (error) {
      console.error('Failed to fetch applications');
    }
  }

  async function fetchShortlist(jobId) {
    try {
      const data = await apiRequest(`/candidates/shortlist/${jobId}`);
      setShortlistedCandidates(Array.isArray(data) ? data : (data.shortlisted || []));
    } catch (error) {
      console.error('Failed to fetch shortlist');
    }
  }

  async function fetchTeamMembers() {
    try {
      const data = await apiRequest('/auth/team-members');
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch team members');
    }
  }

  async function fetchTopCandidates(jobId) {
    if (!jobId) {
      setTopCandidates([]);
      return;
    }

    try {
      const data = await apiRequest(`/scores/top-candidates/${jobId}`);
      setTopCandidates(Array.isArray(data?.topCandidates) ? data.topCandidates : []);
    } catch (error) {
      console.error('Failed to fetch top candidates');
      setTopCandidates([]);
    }
  }

  async function fetchJobRankingList(jobId) {
    if (!jobId) {
      setJobRankingList([]);
      return;
    }

    try {
      const data = await apiRequest(`/candidates/ranking/${jobId}`);
      setJobRankingList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch ranking list');
      setJobRankingList([]);
    }
  }

  // Pulls interview session + candidate random order for a selected job.
  async function fetchInterviewSession(jobId) {
    if (!jobId) {
      setInterviewSession(null);
      return null;
    }

    try {
      const data = await apiRequest(`/interviews/jobs/${jobId}/session`);
      setInterviewSession(data || null);
      return data;
    } catch (_error) {
      setInterviewSession(null);
      return null;
    }
  }

  async function fetchMyOrgProfile() {
    try {
      const data = await apiRequest('/auth/me');
      setOrgProfileForm({
        fullName: data.fullName || '',
        bio: data.bio || '',
        experience: data.experience || '',
        skills: Array.isArray(data.skills) ? data.skills.join(', ') : ''
      });
      setOrgProfileMeta({ cvFileName: data.cvFileName || null, userCode: data.userCode || '' });
    } catch (error) {
      setMessage(error.message || 'Failed to load profile');
      setSuccess(false);
    }
  }

  async function handleSearchMemberProfiles() {
    setSearchingCandidates(true);
    try {
      const query = encodeURIComponent(memberSearchQuery.trim());
      const data = await apiRequest(`/auth/team-member-candidates?query=${query}`);
      setMemberCandidates(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || 'Failed to search profiles');
      setSuccess(false);
      setMemberCandidates([]);
    } finally {
      setSearchingCandidates(false);
    }
  }

  async function handleAddFromProfile(applicantId) {
    setLoading(true);
    setMessage('');
    try {
      const result = await apiRequest('/auth/team-members/from-profile', 'POST', { applicantId });
      setMessage(`${result.message}. Code: ${result.panelistCode}. Temporary Password: ${result.temporaryPassword}`);
      setSuccess(true);
      await fetchTeamMembers();
      await handleSearchMemberProfiles();
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminShortlistJobChange(jobIdValue) {
    const num = Number(jobIdValue);
    setSelectedJob(jobs.find((j) => j.id === num) || null);
    if (!num) {
      setShortlistedCandidates([]);
      setTopCandidates([]);
      setInterviewSession(null);
      return;
    }
    await fetchShortlist(num);
    await fetchTopCandidates(num);
    await fetchInterviewSession(num);
  }

  async function handleUpdateOrgProfile(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('fullName', orgProfileForm.fullName);
      formData.append('bio', orgProfileForm.bio);
      formData.append('experience', orgProfileForm.experience);
      formData.append('skills', JSON.stringify(toKeywords(orgProfileForm.skills)));
      if (orgProfileCv) {
        formData.append('cv', orgProfileCv);
      }

      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${orgToken}` },
        body: formData
      });

      const raw = await response.text();
      let parsed = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        parsed = { message: raw || 'Failed to update profile' };
      }

      if (!response.ok) {
        throw new Error(parsed.message || 'Failed to update profile');
      }

      const profile = parsed.profile || {};
      setOrgProfileMeta({
        cvFileName: profile.cvFileName || null,
        userCode: profile.userCode || orgProfileMeta.userCode
      });

      const updatedOrgUser = {
        ...orgUser,
        name: profile.fullName || orgUser?.name
      };
      setOrgUser(updatedOrgUser);
      localStorage.setItem('org_user_data', JSON.stringify(updatedOrgUser));

      setOrgProfileCv(null);
      setMessage('Profile updated successfully');
      setSuccess(true);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  function setCurrentPage(nextPage) {
    const targetPath = pageToPath[nextPage] || pageToPath.landing;
    setCurrentPageState(nextPage);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }

  // ===== APPLICANT: REGISTER =====
  async function handleApplicantRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await apiRequest('/applicants/register', 'POST', applicantRegisterForm);
      const applicantData = {
        applicantId: result.applicantId,
        fullName: applicantRegisterForm.fullName,
        email: result.email,
        phone: applicantRegisterForm.phone || '',
        location: applicantRegisterForm.location || '',
        experienceLevel: 'entry',
        skills: [],
        resumeFileName: null
      };
      localStorage.setItem('applicant_token', result.token);
      localStorage.setItem('applicant_data', JSON.stringify(applicantData));
      setApplicantToken(result.token);
      setApplicant(applicantData);
      const emailMessage = result.passwordDelivery === 'sent'
        ? 'Account created. A temporary password has been sent to your email.'
        : `Account created. Email delivery unavailable. Temporary password: ${result.temporaryPassword}`;
      setMessage(emailMessage);
      setSuccess(true);
      setApplicantRegisterForm({ fullName: '', email: '', phone: '', location: '' });
      setCurrentPage('applicant-dashboard');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // ===== APPLICANT: LOGIN =====
  async function handleApplicantLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await apiRequest('/applicants/login', 'POST', applicantLoginForm);
      const applicantData = {
        applicantId: result.applicantId,
        fullName: result.fullName,
        email: result.email,
        phone: result.phone || '',
        location: result.location || '',
        experienceLevel: result.experienceLevel || 'entry',
        skills: Array.isArray(result.skills) ? result.skills : (result.skills ? JSON.parse(result.skills) : []),
        resumeFileName: result.resumeFileName || null
      };
      localStorage.removeItem('auth_token');
      localStorage.removeItem('org_user_data');
      setOrgToken('');
      setOrgUser(null);
      localStorage.setItem('applicant_token', result.token);
      localStorage.setItem('applicant_data', JSON.stringify(applicantData));
      setApplicantToken(result.token);
      setApplicant(applicantData);
      setMessage('Login successful!');
      setSuccess(true);
      setApplicantLoginForm({ email: '', password: '' });
      setCurrentPage('applicant-dashboard');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // ===== ORG: REGISTER =====
  async function handleOrgRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    if (orgRegisterForm.managerPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSuccess(false);
      setLoading(false);
      return;
    }
    try {
      const result = await apiRequest('/auth/register-organization', 'POST', {
        organizationName: orgRegisterForm.organizationName,
        managerName: orgRegisterForm.managerName,
        managerEmail: orgRegisterForm.managerEmail,
        managerPassword: orgRegisterForm.managerPassword
      });
      setMessage('Organization registered! Account Code: ' + result.accountCode);
      setSuccess(true);
      setTimeout(() => {
        setOrgLoginForm({ email: orgRegisterForm.managerEmail, password: orgRegisterForm.managerPassword });
        setCurrentPage('login');
      }, 2000);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // ===== ORG: LOGIN =====
  async function handleOrgLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await apiRequest('/auth/login', 'POST', orgLoginForm);
      const serverUser = result.user || {};
      const userData = {
        userId: serverUser.id,
        name: serverUser.fullName,
        email: serverUser.email,
        role: serverUser.role,
        organizationId: serverUser.organizationId,
        organizationName: serverUser.organizationName
      };
      localStorage.removeItem('applicant_token');
      localStorage.removeItem('applicant_data');
      setApplicantToken('');
      setApplicant(null);
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('org_user_data', JSON.stringify(userData));
      setOrgToken(result.token);
      setOrgUser(userData);
      setMessage(`Welcome, ${userData.role === 'admin' ? 'Manager' : 'Team Member'}!`);
      setSuccess(true);
      setOrgLoginForm({ email: '', password: '' });
      setCurrentPage(userData.role === 'admin' ? 'admin-dashboard' : 'panelist-dashboard');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // ===== LOGOUT =====
  function handleLogout() {
    if (isApplicant) {
      localStorage.removeItem('applicant_token');
      localStorage.removeItem('applicant_data');
      setApplicantToken('');
      setApplicant(null);
    } else if (isOrgUser) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('org_user_data');
      setOrgToken('');
      setOrgUser(null);
    }
    setCurrentPage('landing');
  }

  // ===== APPLICANT: UPDATE PROFILE =====
  async function handleUpdateProfile(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('phone', profileForm.phone);
      formData.append('location', profileForm.location);
      formData.append('experienceLevel', profileForm.experienceLevel);
      formData.append('skills', JSON.stringify(toKeywords(profileForm.skills)));
      if (profileResume) {
        formData.append('resume', profileResume);
      }

      const response = await fetch('/api/applicants/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${applicantToken}` },
        body: formData
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      
      const updatedApplicant = {
        ...applicant,
        phone: profileForm.phone,
        location: profileForm.location,
        experienceLevel: profileForm.experienceLevel,
        skills: toKeywords(profileForm.skills),
        resumeFileName: result.applicant?.resumeFileName || applicant.resumeFileName
      };
      setApplicant(updatedApplicant);
      localStorage.setItem('applicant_data', JSON.stringify(updatedApplicant));
      setProfileResume(null);
      setMessage('Profile updated successfully!');
      setSuccess(true);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // ===== APPLICANT: SUBMIT APPLICATION =====
  async function handleApply(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const targetJob = jobs.find((job) => String(job.id) === String(applicationForm.jobId));
      if (targetJob && hasDeadlinePassed(targetJob.application_deadline)) {
        setMessage('Application deadline has passed for this job.');
        setSuccess(false);
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('jobId', applicationForm.jobId);

      const response = await fetch('/api/candidates/apply', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${applicantToken}` },
        body: formData
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      
      const msg = result.usedSavedResume 
        ? `Application submitted! Code: ${result.candidateCode}. Your saved resume was used.`
        : `Application submitted! Code: ${result.candidateCode}`;
      const shortlistMsg = result.shortlisted
        ? ` You are currently shortlisted at rank #${result.rankPosition}.`
        : ' Your application is received and under review for shortlist.';
      setMessage(msg + shortlistMsg);
      setSuccess(true);
      setApplicationForm({ jobId: '' });
      setCvRating(null);
      await fetchApplications();
      setCurrentPage('applicant-dashboard');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // ===== ADMIN: CREATE JOB =====
  async function handleCreateJob(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await apiRequest('/jobs', 'POST', {
        title: jobForm.title,
        description: jobForm.description,
        criteriaKeywords: toKeywords(jobForm.criteria_keywords),
        applicationDeadline: jobForm.applicationDeadline
      });
      setMessage('Job created successfully!');
      setSuccess(true);
      setJobForm({ title: '', description: '', criteria_keywords: '', applicationDeadline: '' });
      await fetchJobs();
      setCurrentPage('admin-jobs');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTeamMember(memberId, memberName) {
    const shouldDelete = window.confirm(`Remove ${memberName}? This cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const result = await apiRequest(`/auth/team-members/${memberId}`, 'DELETE');
      setMessage(result.message || 'Team member removed successfully.');
      setSuccess(true);
      await fetchTeamMembers();
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // Admin action: create one interview day/session for this job.
  async function handleCreateInterviewSession(interviewDate) {
    if (!selectedJob?.id) {
      setMessage('Select a job first.');
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await apiRequest(`/interviews/jobs/${selectedJob.id}/session`, 'POST', { interviewDate });
      setMessage('Interview session created successfully.');
      setSuccess(true);
      await fetchInterviewSession(selectedJob.id);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // Admin action: batch-send interview invite emails to the shortlisted session candidates.
  async function handleSendInterviewInvites() {
    if (!selectedJob?.id) {
      setMessage('Select a job first.');
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const result = await apiRequest(`/interviews/jobs/${selectedJob.id}/send-invites`, 'POST');
      setMessage(`Invite processing complete. Sent: ${result.sent || 0}, Failed: ${result.failed || 0}`);
      setSuccess(true);
      await fetchInterviewSession(selectedJob.id);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  async function handlePanelJobChange(jobId) {
    setPanelJobId(jobId);
    setScoreDrafts({});
    setDrawnCandidate(null);
    if (!jobId) {
      setShortlistedCandidates([]);
      setInterviewSession(null);
      return;
    }
    await fetchShortlist(jobId);
    await fetchInterviewSession(jobId);
  }

  // Panelist action: gets the next random candidate for interview-day scoring.
  async function handleDrawNextCandidate() {
    if (!panelJobId) {
      setMessage('Select a job first.');
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const result = await apiRequest(`/interviews/jobs/${panelJobId}/draw-next`, 'POST');
      if (result.done) {
        setDrawnCandidate(null);
        setMessage('All shortlisted candidates have already been interviewed.');
        setSuccess(true);
      } else {
        setDrawnCandidate(result.candidate || null);
        setMessage(`Candidate drawn: ${result.candidate?.candidateCode || '-'}`);
        setSuccess(true);
      }

      await fetchInterviewSession(panelJobId);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitScore(candidateId) {
    const draft = scoreDrafts[candidateId] || { score: '', notes: '' };
    const numericScore = Number(draft.score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 65) {
      setMessage('Score must be a number between 0 and 65');
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await apiRequest('/scores', 'POST', {
        jobId: Number(panelJobId),
        candidateId: Number(candidateId),
        score: numericScore,
        notes: draft.notes || ''
      });
      setMessage('Interview score submitted successfully.');
      setSuccess(true);
      if (drawnCandidate && Number(drawnCandidate.candidateId) === Number(candidateId)) {
        setDrawnCandidate(null);
      }
      await fetchInterviewSession(panelJobId);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleRateCv() {
    if (!applicant?.resumeFileName) {
      setMessage('Please upload a resume in your profile first.');
      setSuccess(false);
      return;
    }

    setRatingLoading(true);
    setMessage('');
    try {
      const jobId = applicationForm?.jobId || selectedJob?.id || '';
      const query = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
      const result = await apiRequest(`/applicants/cv-feedback${query}`);
      setCvRating(result);
      setMessage(`CV rating complete: ${result.rating}/10`);
      setSuccess(true);
    } catch (error) {
      setMessage(error.message || 'Failed to rate CV');
      setSuccess(false);
      setCvRating(null);
    } finally {
      setRatingLoading(false);
    }
  }

  async function handleDownloadCv() {
    if (!applicantToken) {
      setMessage('Please log in again to access your CV.');
      setSuccess(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/applicants/resume`, {
        headers: {
          Authorization: `Bearer ${applicantToken}`
        }
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || 'Failed to download CV');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || applicant?.resumeFileName || 'my-cv';

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      setMessage('CV downloaded successfully.');
      setSuccess(true);
    } catch (error) {
      setMessage(error.message || 'Failed to download CV');
      setSuccess(false);
    }
  }

  async function handleDeleteApplication(candidateId) {
    const shouldDelete = window.confirm('Delete this application?');
    if (!shouldDelete) {
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await apiRequest(`/candidates/my-applications/${candidateId}`, 'DELETE');
      setMessage('Application deleted successfully.');
      setSuccess(true);
      await fetchApplications();
      await fetchJobs();
    } catch (error) {
      setMessage(error.message || 'Failed to delete application');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  function handleGuestAuthSuccess(payload) {
    if (payload.accountType === 'applicant') {
      setApplicantToken(payload.token);
      setApplicant(payload.applicantData);
      setOrgToken('');
      setOrgUser(null);
      setCurrentPage('applicant-dashboard');
      return;
    }

    setOrgToken(payload.token);
    setOrgUser(payload.userData);
    setApplicantToken('');
    setApplicant(null);
    setCurrentPage(payload.userData.role === 'admin' ? 'admin-dashboard' : 'panelist-dashboard');
  }

  if (!isApplicant && !isOrgUser) {
    return (
      <GuestRoutes
        currentPage={currentPage}
        loading={loading}
        setLoading={setLoading}
        message={message}
        setMessage={setMessage}
        success={success}
        setSuccess={setSuccess}
        setCurrentPage={setCurrentPage}
        onAuthSuccess={handleGuestAuthSuccess}
        setApplicantToken={setApplicantToken}
        setApplicant={setApplicant}
      />
    );
  }

  if (isApplicant) {
    return (
      <ApplicantApp
        AccountIcon={AccountIcon}
        currentPage={currentPage}
        applicant={applicant}
        handleLogout={handleLogout}
        setCurrentPage={setCurrentPage}
        myApplications={myApplications}
        rankingExpanded={rankingExpanded}
        setRankingExpanded={setRankingExpanded}
        jobRankingList={jobRankingList}
        fetchJobRankingList={fetchJobRankingList}
        loading={loading}
        handleDeleteApplication={handleDeleteApplication}
        jobs={jobs}
        applicationForm={applicationForm}
        setApplicationForm={setApplicationForm}
        selectedJob={selectedJob}
        setSelectedJob={setSelectedJob}
        cvRating={cvRating}
        ratingLoading={ratingLoading}
        handleRateCv={handleRateCv}
        handleApply={handleApply}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        profileResume={profileResume}
        setProfileResume={setProfileResume}
        handleDownloadCv={handleDownloadCv}
        handleUpdateProfile={handleUpdateProfile}
      />
    );
  }

  if (isAdmin) {
    return (
      <AdminApp
        AccountIcon={AccountIcon}
        currentPage={currentPage}
        orgUser={orgUser}
        handleLogout={handleLogout}
        setCurrentPage={setCurrentPage}
        jobs={jobs}
        loading={loading}
        setLoading={setLoading}
        message={message}
        setMessage={setMessage}
        success={success}
        setSuccess={setSuccess}
        fetchJobs={fetchJobs}
        setSelectedJob={setSelectedJob}
        selectedJob={selectedJob}
        fetchShortlist={fetchShortlist}
        shortlistedCandidates={shortlistedCandidates}
        topCandidates={topCandidates}
        handleAdminShortlistJobChange={handleAdminShortlistJobChange}
        interviewSession={interviewSession}
        handleCreateInterviewSession={handleCreateInterviewSession}
        handleSendInterviewInvites={handleSendInterviewInvites}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        handleSearchMemberProfiles={handleSearchMemberProfiles}
        searchingCandidates={searchingCandidates}
        memberCandidates={memberCandidates}
        profileImageFromName={profileImageFromName}
        profileBio={profileBio}
        parseSkillList={parseSkillList}
        handleAddFromProfile={handleAddFromProfile}
        teamMembers={teamMembers}
        handleRemoveTeamMember={handleRemoveTeamMember}
        orgProfileMeta={orgProfileMeta}
        orgProfileForm={orgProfileForm}
        setOrgProfileForm={setOrgProfileForm}
        orgProfileCv={orgProfileCv}
        setOrgProfileCv={setOrgProfileCv}
        handleUpdateOrgProfile={handleUpdateOrgProfile}
      />
    );
  }

  if (isPanelist) {
    return (
      <PanelistApp
        AccountIcon={AccountIcon}
        currentPage={currentPage}
        orgUser={orgUser}
        handleLogout={handleLogout}
        setCurrentPage={setCurrentPage}
        panelJobId={panelJobId}
        jobs={jobs}
        handlePanelJobChange={handlePanelJobChange}
        shortlistedCandidates={shortlistedCandidates}
        scoreDrafts={scoreDrafts}
        setScoreDrafts={setScoreDrafts}
        loading={loading}
        drawnCandidate={drawnCandidate}
        interviewSession={interviewSession}
        handleDrawNextCandidate={handleDrawNextCandidate}
        handleSubmitScore={handleSubmitScore}
        orgProfileMeta={orgProfileMeta}
        orgProfileForm={orgProfileForm}
        setOrgProfileForm={setOrgProfileForm}
        orgProfileCv={orgProfileCv}
        setOrgProfileCv={setOrgProfileCv}
        handleUpdateOrgProfile={handleUpdateOrgProfile}
      />
    );
  }

  return null;
}
