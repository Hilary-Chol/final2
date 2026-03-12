import { useState, useEffect } from 'react';
import { apiRequest } from './services/api';

// Professional role-based recruitment application
// Supports: Applicants (job seekers), Admins (organization), Panelists (interviewers)

function toKeywords(value) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function App() {
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
  const [currentPage, setCurrentPage] = useState('landing');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===== DATA STATE =====
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  // ===== APPLICANT FORMS =====
  const [applicantRegisterForm, setApplicantRegisterForm] = useState({
    fullName: '', email: '', password: '', phone: '', location: '', experienceLevel: 'entry', skills: ''
  });
  const [applicantLoginForm, setApplicantLoginForm] = useState({ email: '', password: '' });
  const [applicationForm, setApplicationForm] = useState({ jobId: '', qualificationScore: '', experienceYears: '', profileKeywords: '' });
  const [profileForm, setProfileForm] = useState({ phone: '', location: '', experienceLevel: 'entry', skills: '' });
  const [profileResume, setProfileResume] = useState(null);

  // ===== ORG FORMS =====
  const [orgRegisterForm, setOrgRegisterForm] = useState({
    organizationName: '', adminName: '', adminEmail: '', adminPassword: ''
  });
  const [orgLoginForm, setOrgLoginForm] = useState({ email: '', password: '' });
  const [jobForm, setJobForm] = useState({ title: '', description: '', criteria_keywords: '' });

  // ===== EFFECTS =====
  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (isApplicant) {
      fetchApplications();
    }
  }, [applicantToken]);

  // ===== API CALLS =====
  async function fetchJobs() {
    try {
      const data = await apiRequest('/jobs');
      setJobs(data || []);
    } catch (error) {
      console.error('Failed to fetch jobs');
    }
  }

  async function fetchApplications() {
    if (!applicantToken) return;
    try {
      const data = await apiRequest('/candidates/applications');
      setMyApplications(data || []);
    } catch (error) {
      console.error('Failed to fetch applications');
    }
  }

  async function fetchShortlist(jobId) {
    try {
      const data = await apiRequest(`/candidates/shortlist/${jobId}`);
      setShortlistedCandidates(data.shortlisted || []);
    } catch (error) {
      console.error('Failed to fetch shortlist');
    }
  }

  // ===== APPLICANT: REGISTER =====
  async function handleApplicantRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    if (applicantRegisterForm.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSuccess(false);
      setLoading(false);
      return;
    }
    try {
      const result = await apiRequest('/applicants/register', 'POST', applicantRegisterForm);
      const applicantData = {
        applicantId: result.applicantId,
        fullName: applicantRegisterForm.fullName,
        email: result.email,
        phone: applicantRegisterForm.phone || '',
        location: applicantRegisterForm.location || '',
        experienceLevel: applicantRegisterForm.experienceLevel,
        skills: toKeywords(applicantRegisterForm.skills),
        resumeFileName: null
      };
      localStorage.setItem('applicant_token', result.token);
      localStorage.setItem('applicant_data', JSON.stringify(applicantData));
      setApplicantToken(result.token);
      setApplicant(applicantData);
      setMessage('Account created successfully!');
      setSuccess(true);
      setApplicantRegisterForm({ fullName: '', email: '', password: '', phone: '', location: '', experienceLevel: 'entry', skills: '' });
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
        experienceLevel: result.experience_level || 'entry',
        skills: Array.isArray(result.skills) ? result.skills : (result.skills ? JSON.parse(result.skills) : []),
        resumeFileName: result.resume_file_name || null
      };
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
    if (orgRegisterForm.adminPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSuccess(false);
      setLoading(false);
      return;
    }
    try {
      const result = await apiRequest('/auth/register-organization', 'POST', {
        organizationName: orgRegisterForm.organizationName,
        adminName: orgRegisterForm.adminName,
        adminEmail: orgRegisterForm.adminEmail,
        adminPassword: orgRegisterForm.adminPassword
      });
      setMessage('Organization registered! Account Code: ' + result.accountCode);
      setSuccess(true);
      setTimeout(() => {
        setOrgLoginForm({ email: orgRegisterForm.adminEmail, password: orgRegisterForm.adminPassword });
        setCurrentPage('org-login');
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
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('org_user_data', JSON.stringify(userData));
      setOrgToken(result.token);
      setOrgUser(userData);
      setMessage(`Welcome, ${userData.role === 'admin' ? 'Admin' : 'Panelist'}!`);
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
        formData.append('file', profileResume);
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
        resumeFileName: result.resume_file_name || applicant.resumeFileName
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
      const formData = new FormData();
      formData.append('jobId', applicationForm.jobId);
      formData.append('qualificationScore', applicationForm.qualificationScore || '0');
      formData.append('experienceYears', applicationForm.experienceYears || '0');
      formData.append('profileKeywords', JSON.stringify(toKeywords(applicationForm.profileKeywords)));

      const response = await fetch('/api/candidates/apply', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${applicantToken}` },
        body: formData
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      
      const msg = result.usedSavedResume 
        ? `Application submitted! Code: ${result.candidate_code}. Your saved resume was used.`
        : `Application submitted! Code: ${result.candidate_code}`;
      setMessage(msg);
      setSuccess(true);
      setApplicationForm({ jobId: '', qualificationScore: '', experienceYears: '', profileKeywords: '' });
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
        criteria_keywords: toKeywords(jobForm.criteria_keywords)
      });
      setMessage('Job created successfully!');
      setSuccess(true);
      setJobForm({ title: '', description: '', criteria_keywords: '' });
      await fetchJobs();
      setCurrentPage('admin-jobs');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  // ===== LANDING PAGE =====
  if (!isApplicant && !isOrgUser && currentPage === 'landing') {
    return (
      <div className="page page-landing">
        <header className="landing-header">
          <h1>CIVIRA</h1>
          <p className="subtitle">Transparent Public Recruitment System</p>
          <p className="tagline">Ending Favouritism. Empowering Merit. Protecting Lives.</p>
        </header>

        <div className="portal-grid">
          <div className="portal-card">
            <div className="portal-icon">👤</div>
            <h2>Job Applicants</h2>
            <p>Discover job openings, apply directly, and track your application progress.</p>
            <div className="portal-actions">
              <button className="btn-primary" onClick={() => setCurrentPage('applicant-login')}>Login</button>
              <button className="btn-secondary" onClick={() => setCurrentPage('applicant-register')}>Register</button>
            </div>
          </div>

          <div className="portal-card">
            <div className="portal-icon">🏢</div>
            <h2>Organizations</h2>
            <p>Create jobs, review candidates, coordinate panel scoring, and make final selections.</p>
            <div className="portal-actions">
              <button className="btn-primary" onClick={() => setCurrentPage('org-login')}>Login</button>
              <button className="btn-secondary" onClick={() => setCurrentPage('org-register')}>Register</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== APPLICANT LOGIN =====
  if (!isApplicant && currentPage === 'applicant-login') {
    return (
      <div className="page page-auth">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Applicant Login</h2>
            <form onSubmit={handleApplicantLogin}>
              <input type="email" placeholder="Email" value={applicantLoginForm.email} onChange={(e) => setApplicantLoginForm({...applicantLoginForm, email: e.target.value})} required />
              <input type="password" placeholder="Password" value={applicantLoginForm.password} onChange={(e) => setApplicantLoginForm({...applicantLoginForm, password: e.target.value})} required />
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
            {message && <div className={`message ${success ? 'success' : 'error'}`}>{message}</div>}
            <p className="auth-link">Don't have an account? <button className="btn-link" onClick={() => setCurrentPage('applicant-register')}>Register</button></p>
            <button className="btn-back" onClick={() => setCurrentPage('landing')}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== APPLICANT REGISTER =====
  if (!isApplicant && currentPage === 'applicant-register') {
    return (
      <div className="page page-auth">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Create Applicant Account</h2>
            <form onSubmit={handleApplicantRegister}>
              <input type="text" placeholder="Full Name" value={applicantRegisterForm.fullName} onChange={(e) => setApplicantRegisterForm({...applicantRegisterForm, fullName: e.target.value})} required />
              <input type="email" placeholder="Email" value={applicantRegisterForm.email} onChange={(e) => setApplicantRegisterForm({...applicantRegisterForm, email: e.target.value})} required />
              <input type="password" placeholder="Password (min 6 chars)" value={applicantRegisterForm.password} onChange={(e) => setApplicantRegisterForm({...applicantRegisterForm, password: e.target.value})} required minLength="6" />
              <input type="tel" placeholder="Phone (optional)" value={applicantRegisterForm.phone} onChange={(e) => setApplicantRegisterForm({...applicantRegisterForm, phone: e.target.value})} />
              <input type="text" placeholder="Location (optional)" value={applicantRegisterForm.location} onChange={(e) => setApplicantRegisterForm({...applicantRegisterForm, location: e.target.value})} />
              <select value={applicantRegisterForm.experienceLevel} onChange={(e) => setApplicantRegisterForm({...applicantRegisterForm, experienceLevel: e.target.value})}>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior</option>
                <option value="executive">Executive</option>
              </select>
              <textarea placeholder="Skills (comma-separated, optional)" value={applicantRegisterForm.skills} onChange={(e) => setApplicantRegisterForm({...applicantRegisterForm, skills: e.target.value})} rows="3"></textarea>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
            </form>
            {message && <div className={`message ${success ? 'success' : 'error'}`}>{message}</div>}
            <p className="auth-link">Already have an account? <button className="btn-link" onClick={() => setCurrentPage('applicant-login')}>Login</button></p>
            <button className="btn-back" onClick={() => setCurrentPage('landing')}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== ORG LOGIN =====
  if (!isOrgUser && currentPage === 'org-login') {
    return (
      <div className="page page-auth">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Organization Login</h2>
            <form onSubmit={handleOrgLogin}>
              <input type="email" placeholder="Email" value={orgLoginForm.email} onChange={(e) => setOrgLoginForm({...orgLoginForm, email: e.target.value})} required />
              <input type="password" placeholder="Password" value={orgLoginForm.password} onChange={(e) => setOrgLoginForm({...orgLoginForm, password: e.target.value})} required />
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
            {message && <div className={`message ${success ? 'success' : 'error'}`}>{message}</div>}
            <p className="auth-link">New organization? <button className="btn-link" onClick={() => setCurrentPage('org-register')}>Register</button></p>
            <button className="btn-back" onClick={() => setCurrentPage('landing')}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== ORG REGISTER =====
  if (!isOrgUser && currentPage === 'org-register') {
    return (
      <div className="page page-auth">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Register Organization</h2>
            <form onSubmit={handleOrgRegister}>
              <input type="text" placeholder="Organization Name" value={orgRegisterForm.organizationName} onChange={(e) => setOrgRegisterForm({...orgRegisterForm, organizationName: e.target.value})} required />
              <input type="text" placeholder="Admin Name" value={orgRegisterForm.adminName} onChange={(e) => setOrgRegisterForm({...orgRegisterForm, adminName: e.target.value})} required />
              <input type="email" placeholder="Admin Email" value={orgRegisterForm.adminEmail} onChange={(e) => setOrgRegisterForm({...orgRegisterForm, adminEmail: e.target.value})} required />
              <input type="password" placeholder="Password (min 6 chars)" value={orgRegisterForm.adminPassword} onChange={(e) => setOrgRegisterForm({...orgRegisterForm, adminPassword: e.target.value})} required minLength="6" />
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
            </form>
            {message && <div className={`message ${success ? 'success' : 'error'}`}>{message}</div>}
            <p className="auth-link">Already registered? <button className="btn-link" onClick={() => setCurrentPage('org-login')}>Login</button></p>
            <button className="btn-back" onClick={() => setCurrentPage('landing')}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== APPLICANT PAGES =====
  if (isApplicant) {
    return (
      <div className="app-page">
        <header className="app-header">
          <div className="header-content">
            <h1>CIVIRA</h1>
            <p className="header-subtitle">Applicant Portal</p>
          </div>
          <div className="header-user">
            <span>👤 {applicant?.fullName}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <nav className="app-nav">
          <button className={`nav-btn ${currentPage === 'applicant-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-dashboard')}>Dashboard</button>
          <button className={`nav-btn ${currentPage === 'applicant-browse' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-browse')}>Browse Jobs</button>
          <button className={`nav-btn ${currentPage === 'applicant-apply' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-apply')}>Apply</button>
          <button className={`nav-btn ${currentPage === 'applicant-profile' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-profile')}>Profile</button>
        </nav>

        {message && <div className={`message ${success ? 'success' : 'error'}`}>{message}</div>}

        {currentPage === 'applicant-dashboard' && (
          <div className="page-content">
            <div className="content-container">
              <h1>My Applications</h1>
              {myApplications.length === 0 ? (
                <p className="empty-state">No applications yet. <button className="btn-link" onClick={() => setCurrentPage('applicant-browse')}>Browse jobs</button></p>
              ) : (
                <div className="applications-grid">
                  {myApplications.map(app => (
                    <div key={app.id} className="application-card">
                      <h3>{app.job_title}</h3>
                      <p><strong>Code:</strong> {app.candidate_code}</p>
                      <p><strong>Applied:</strong> {formatDate(app.created_at)}</p>
                      <p className={`status-badge ${app.rank_position ? 'shortlisted' : 'pending'}`}>
                        {app.rank_position ? `✓ Shortlisted (#${app.rank_position})` : '○ Under Review'}
                      </p>
                      {app.ranking_score && <p><strong>Score:</strong> {parseFloat(app.ranking_score).toFixed(2)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'applicant-browse' && (
          <div className="page-content">
            <div className="content-container">
              <h1>Browse Jobs</h1>
              {jobs.length === 0 ? (
                <p className="empty-state">No jobs available.</p>
              ) : (
                <div className="jobs-grid">
                  {jobs.map(job => (
                    <div key={job.id} className="job-card">
                      <h3>{job.title}</h3>
                      <p>{job.description || 'No description'}</p>
                      <p><strong>Keywords:</strong> {Array.isArray(job.criteria_keywords) ? job.criteria_keywords.join(', ') : 'N/A'}</p>
                      <p className={`badge ${job.status}`}>{job.status}</p>
                      <button className="btn-primary" onClick={() => { setApplicationForm({...applicationForm, jobId: String(job.id)}); setCurrentPage('applicant-apply'); }}>Apply Now</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'applicant-apply' && (
          <div className="page-content">
            <div className="content-container">
              <h1>Submit Application</h1>
              <form onSubmit={handleApply} className="form">
                <select value={applicationForm.jobId} onChange={(e) => {setApplicationForm({...applicationForm, jobId: e.target.value}); setSelectedJob(jobs.find(j => String(j.id) === e.target.value));}} required>
                  <option value="">Select a Job</option>
                  {jobs.map(j => (<option key={j.id} value={j.id}>{j.title}</option>))}
                </select>

                {selectedJob && (
                  <div className="job-preview">
                    <h2>{selectedJob.title}</h2>
                    <p>{selectedJob.description}</p>
                    <p><strong>Keywords:</strong> {Array.isArray(selectedJob.criteria_keywords) ? selectedJob.criteria_keywords.join(', ') : 'N/A'}</p>
                  </div>
                )}

                <input type="number" placeholder="Qualification Score (0-100)" value={applicationForm.qualificationScore} onChange={(e) => setApplicationForm({...applicationForm, qualificationScore: e.target.value})} />
                <input type="number" placeholder="Years of Experience" value={applicationForm.experienceYears} onChange={(e) => setApplicationForm({...applicationForm, experienceYears: e.target.value})} />
                <textarea placeholder="Your Keywords (comma-separated)" value={applicationForm.profileKeywords} onChange={(e) => setApplicationForm({...applicationForm, profileKeywords: e.target.value})} rows="3"></textarea>

                {applicant?.resumeFileName && <p className="info">✓ Saved resume: {applicant.resumeFileName}</p>}
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>
              </form>
            </div>
          </div>
        )}

        {currentPage === 'applicant-profile' && (
          <div className="page-content">
            <div className="content-container">
              <h1>My Profile</h1>
              <form onSubmit={handleUpdateProfile} className="form">
                <p><strong>Email:</strong> {applicant?.email}</p>
                <p><strong>Name:</strong> {applicant?.fullName}</p>
                {applicant?.resumeFileName && <p><strong>Saved Resume:</strong> {applicant.resumeFileName}</p>}

                <input type="tel" placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} />
                <input type="text" placeholder="Location" value={profileForm.location} onChange={(e) => setProfileForm({...profileForm, location: e.target.value})} />
                <select value={profileForm.experienceLevel} onChange={(e) => setProfileForm({...profileForm, experienceLevel: e.target.value})}>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior</option>
                  <option value="executive">Executive</option>
                </select>
                <textarea placeholder="Skills (comma-separated)" value={profileForm.skills} onChange={(e) => setProfileForm({...profileForm, skills: e.target.value})} rows="3"></textarea>

                <div className="file-upload">
                  <label>Upload/Update Resume</label>
                  <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setProfileResume(e.target.files?.[0] || null)} />
                  {profileResume && <p className="upload-status">✓ {profileResume.name}</p>}
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== ADMIN PAGES =====
  if (isAdmin) {
    return (
      <div className="app-page">
        <header className="app-header">
          <div className="header-content">
            <h1>CIVIRA</h1>
            <p className="header-subtitle">Admin Dashboard</p>
          </div>
          <div className="header-user">
            <span>👨‍💼 {orgUser?.name}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <nav className="app-nav">
          <button className={`nav-btn ${currentPage === 'admin-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-dashboard')}>Dashboard</button>
          <button className={`nav-btn ${currentPage === 'admin-jobs' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-jobs')}>Manage Jobs</button>
          <button className={`nav-btn ${currentPage === 'admin-shortlist' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-shortlist')}>Shortlist</button>
        </nav>

        {message && <div className={`message ${success ? 'success' : 'error'}`}>{message}</div>}

        {currentPage === 'admin-dashboard' && (
          <div className="page-content">
            <div className="content-container">
              <h1>Admin Dashboard</h1>
              <div className="dashboard-stats">
                <div className="stat-card">
                  <h3>{jobs.length}</h3>
                  <p>Active Jobs</p>
                </div>
              </div>
              <div className="admin-actions">
                <button className="btn-primary" onClick={() => setCurrentPage('admin-jobs')}>+ Create Job</button>
                <button className="btn-secondary" onClick={() => setCurrentPage('admin-shortlist')}>Review Shortlist</button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'admin-jobs' && (
          <div className="page-content">
            <div className="content-container">
              <h1>Manage Jobs</h1>
              <form onSubmit={handleCreateJob} className="form">
                <input type="text" placeholder="Job Title" value={jobForm.title} onChange={(e) => setJobForm({...jobForm, title: e.target.value})} required />
                <textarea placeholder="Job Description" value={jobForm.description} onChange={(e) => setJobForm({...jobForm, description: e.target.value})} rows="4"></textarea>
                <input type="text" placeholder="Criteria Keywords (comma-separated)" value={jobForm.criteria_keywords} onChange={(e) => setJobForm({...jobForm, criteria_keywords: e.target.value})} />
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Job'}</button>
              </form>

              <h2 style={{ marginTop: '40px' }}>Active Jobs</h2>
              {jobs.length === 0 ? (
                <p className="empty-state">No jobs yet.</p>
              ) : (
                <div className="jobs-list">
                  {jobs.map(job => (
                    <div key={job.id} className="job-item">
                      <h3>{job.title}</h3>
                      <p>{job.description || 'No description'}</p>
                      <p><strong>Keywords:</strong> {Array.isArray(job.criteria_keywords) ? job.criteria_keywords.join(', ') : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'admin-shortlist' && (
          <div className="page-content">
            <div className="content-container">
              <h1>Shortlist Management</h1>
              <select value={selectedJob?.id || ''} onChange={(e) => {const num = Number(e.target.value); setSelectedJob(jobs.find(j => j.id === num)); if(num) fetchShortlist(num);}} className="select">
                <option value="">Select a job</option>
                {jobs.map(j => (<option key={j.id} value={j.id}>{j.title}</option>))}
              </select>

              {selectedJob && (
                <div style={{ marginTop: '30px' }}>
                  {shortlistedCandidates.length === 0 ? (
                    <p className="empty-state">No shortlisted candidates yet.</p>
                  ) : (
                    <div className="candidates-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Email</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shortlistedCandidates.map((cand, idx) => (
                            <tr key={cand.id}>
                              <td>#{idx + 1}</td>
                              <td>{cand.fullName || cand.name}</td>
                              <td>{cand.candidate_code}</td>
                              <td>{cand.email}</td>
                              <td>{parseFloat(cand.ranking_score).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== PANELIST PAGES =====
  if (isPanelist) {
    return (
      <div className="app-page">
        <header className="app-header">
          <div className="header-content">
            <h1>CIVIRA</h1>
            <p className="header-subtitle">Panelist Portal</p>
          </div>
          <div className="header-user">
            <span>👨‍⚖️ {orgUser?.name}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <nav className="app-nav">
          <button className={`nav-btn ${currentPage === 'panelist-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('panelist-dashboard')}>Dashboard</button>
          <button className={`nav-btn ${currentPage === 'panelist-scoring' ? 'active' : ''}`} onClick={() => setCurrentPage('panelist-scoring')}>Score Candidates</button>
        </nav>

        {message && <div className={`message ${success ? 'success' : 'error'}`}>{message}</div>}

        {currentPage === 'panelist-dashboard' && (
          <div className="page-content">
            <div className="content-container">
              <h1>Panelist Dashboard</h1>
              <p className="info">Review and score applicants for assigned jobs.</p>
              <button className="btn-primary" onClick={() => setCurrentPage('panelist-scoring')}>Score Candidates</button>
            </div>
          </div>
        )}

        {currentPage === 'panelist-scoring' && (
          <div className="page-content">
            <div className="content-container">
              <h1>Score Candidates</h1>
              <p className="info">Scoring interface for shortlisted candidates coming soon.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
