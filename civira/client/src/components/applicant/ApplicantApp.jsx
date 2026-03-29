import { formatDate, hasDeadlinePassed } from '../../utils/helpers';

export default function ApplicantApp({
  AccountIcon,
  currentPage,
  applicant,
  handleLogout,
  setCurrentPage,
  myApplications,
  rankingExpanded,
  setRankingExpanded,
  jobRankingList,
  fetchJobRankingList,
  loading,
  handleDeleteApplication,
  jobs,
  applicationForm,
  setApplicationForm,
  selectedJob,
  setSelectedJob,
  cvRating,
  ratingLoading,
  handleRateCv,
  handleApply,
  profileForm,
  setProfileForm,
  profileResume,
  setProfileResume,
  handleDownloadCv,
  handleUpdateProfile
}) {
  return (
    <div className="app-page">
      <header className="app-header">
        <div className="header-content">
          <h1>CIVIRA</h1>
          <div className="header-user">
            <button type="button" className="header-account-btn" onClick={() => setCurrentPage('applicant-profile')}>
              <span className="header-account"><AccountIcon /> {applicant?.fullName}</span>
            </button>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button className={`nav-btn ${currentPage === 'applicant-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-dashboard')}>Dashboard</button>
        <button className={`nav-btn ${currentPage === 'applicant-browse' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-browse')}>Browse Jobs</button>
        <button className={`nav-btn ${currentPage === 'applicant-apply' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-apply')}>Apply</button>
        <button className={`nav-btn ${currentPage === 'applicant-profile' ? 'active' : ''}`} onClick={() => setCurrentPage('applicant-profile')}>Profile</button>
      </nav>

      {currentPage === 'applicant-dashboard' && (
        <div className="page-content">
          <div className="content-container">
            <h1>My Applications</h1>
            {myApplications.length === 0 ? (
              <p className="empty-state">No applications yet. <button className="btn-link" onClick={() => setCurrentPage('applicant-browse')}>Browse jobs</button></p>
            ) : (
              <div className="applications-grid">
                {myApplications.map(app => (
                  <div key={app.id}>
                    <div className="application-card">
                      <h3>{app.job_title}</h3>
                      <p><strong>Code:</strong> {app.candidate_code}</p>
                      <p><strong>Applied:</strong> {formatDate(app.created_at)}</p>
                      <p><strong>Job Status:</strong> {app.job_status || '-'}</p>
                      <p><strong>Panel Reviews:</strong> {Number(app.score_count || 0)}</p>
                      <p className={`status-badge ${app.rank_position ? 'shortlisted' : 'pending'}`}>
                        {app.rank_position ? `✓ Shortlisted (#${app.rank_position})` : '○ Under Review'}
                      </p>
                      <p>
                        <strong>Rank:</strong>{' '}
                        {app.rank_position
                          ? `#${app.rank_position} of ${Number(app.total_applicants || 0)}`
                          : `Not in top 10 yet (Total applicants: ${Number(app.total_applicants || 0)})`}
                      </p>
                      {app.ranking_score && <p><strong>Score:</strong> {parseFloat(app.ranking_score).toFixed(2)}</p>}
                      <div className="application-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setRankingExpanded(rankingExpanded === app.job_id ? null : app.job_id);
                            if (rankingExpanded !== app.job_id) {
                              fetchJobRankingList(app.job_id);
                            }
                          }}
                        >
                          {rankingExpanded === app.job_id ? 'Hide Rankings' : 'View Rankings'}
                        </button>
                        <button className="btn-secondary" disabled={loading} onClick={() => handleDeleteApplication(app.id)}>
                          {loading ? 'Please wait...' : 'Delete Application'}
                        </button>
                      </div>
                    </div>
                    {rankingExpanded === app.job_id && jobRankingList.length > 0 && (
                      <div className="ranking-list-container">
                        <h4>Candidate Rankings for {app.job_title}</h4>
                        <div className="ranking-table">
                          <div className="ranking-header">
                            <div className="rank-col">Rank</div>
                            <div className="name-col">Name</div>
                            <div className="score-col">Score</div>
                            <div className="exp-col">Experience</div>
                            <div className="qual-col">Qualification</div>
                            <div className="status-col">Status</div>
                          </div>
                          {jobRankingList.map((candidate) => (
                            <div key={candidate.id} className={`ranking-row ${candidate.id === myApplications.find(a => a.job_id === app.job_id)?.id ? 'current-applicant' : ''}`}>
                              <div className="rank-col">{candidate.rank_position || '-'}</div>
                              <div className="name-col">{candidate.full_name}</div>
                              <div className="score-col">{candidate.ranking_score}</div>
                              <div className="exp-col">{candidate.experience_years} yrs</div>
                              <div className="qual-col">{candidate.qualification_score}/10</div>
                              <div className="status-col">
                                <span className={`status-badge-small ${candidate.status === 'shortlisted' ? 'shortlisted' : 'not-shortlisted'}`}>
                                  {candidate.status === 'shortlisted' ? 'Shortlisted' : 'Under Review'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                {jobs.map(job => {
                  const deadlinePassed = hasDeadlinePassed(job.application_deadline);
                  const canApply = job.status === 'open' && !deadlinePassed;

                  return (
                    <div key={job.id} className="job-card">
                      <h3>{job.title}</h3>
                      <p className="job-description">{job.description || 'No description'}</p>
                      <p><strong>Keywords:</strong> {Array.isArray(job.criteria_keywords) ? job.criteria_keywords.join(', ') : 'N/A'}</p>
                      <p><strong>Deadline:</strong> {job.application_deadline ? formatDate(job.application_deadline) : 'Not set'}</p>
                      <p className={`badge ${job.status}`}>{job.status}</p>
                      <button
                        className="btn-primary"
                        disabled={!canApply}
                        onClick={() => {
                          setApplicationForm({ ...applicationForm, jobId: String(job.id) });
                          setCurrentPage('applicant-apply');
                        }}
                      >
                        {canApply ? 'Apply Now' : 'Deadline Passed'}
                      </button>
                    </div>
                  );
                })}
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
                {jobs.map(j => {
                  const expired = hasDeadlinePassed(j.application_deadline);
                  const disabled = j.status !== 'open' || expired;
                  return (
                    <option key={j.id} value={j.id} disabled={disabled}>
                      {j.title}{disabled ? ' (Closed)' : ''}
                    </option>
                  );
                })}
              </select>

              {selectedJob && (
                <div className="job-preview">
                  <h2>{selectedJob.title}</h2>
                  <p>{selectedJob.description}</p>
                  <p><strong>Keywords:</strong> {Array.isArray(selectedJob.criteria_keywords) ? selectedJob.criteria_keywords.join(', ') : 'N/A'}</p>
                  <p><strong>Deadline:</strong> {selectedJob.application_deadline ? formatDate(selectedJob.application_deadline) : 'Not set'}</p>
                  {hasDeadlinePassed(selectedJob.application_deadline) && (
                    <p className="message error" style={{ marginTop: '8px' }}>This deadline has passed. You cannot apply to this job.</p>
                  )}
                </div>
              )}

              {applicant?.resumeFileName && <p className="info">✓ Saved resume: {applicant.resumeFileName}</p>}
              <p className="info">Qualification score, years of experience, and profile keywords are auto-extracted from your CV.</p>

              <button type="button" className="btn-secondary" disabled={ratingLoading} onClick={handleRateCv}>
                {ratingLoading ? 'Generating CV Feedback...' : 'Get CV Feedback'}
              </button>

              {cvRating && (
                <div className="job-preview">
                  <h2>CV Rating: {cvRating.rating}/10</h2>
                  <p><strong>Strengths:</strong> {Array.isArray(cvRating.strengths) ? cvRating.strengths.join(', ') : '-'}</p>
                  <p><strong>Improvements:</strong> {Array.isArray(cvRating.improvements) ? cvRating.improvements.join(', ') : '-'}</p>
                  <p><strong>Source:</strong> {cvRating.source || 'AI'}</p>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading || (selectedJob && hasDeadlinePassed(selectedJob.application_deadline))}>{loading ? 'Submitting...' : 'Submit Application'}</button>
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

              <div className="application-actions">
                <button type="button" className="btn-secondary" disabled={!applicant?.resumeFileName} onClick={handleDownloadCv}>
                  Access My CV
                </button>
                <button type="button" className="btn-secondary" disabled={ratingLoading || !applicant?.resumeFileName} onClick={handleRateCv}>
                  {ratingLoading ? 'Generating CV Feedback...' : 'Get CV Feedback'}
                </button>
              </div>

              {cvRating && (
                <div className="job-preview">
                  <h2>CV Feedback: {cvRating.rating}/10</h2>
                  <p><strong>Strengths:</strong> {Array.isArray(cvRating.strengths) ? cvRating.strengths.join(', ') : '-'}</p>
                  <p><strong>Improvements:</strong> {Array.isArray(cvRating.improvements) ? cvRating.improvements.join(', ') : '-'}</p>
                  <p><strong>Detected Keywords:</strong> {Array.isArray(cvRating.extractedKeywords) ? cvRating.extractedKeywords.join(', ') : '-'}</p>
                  <p><strong>Source:</strong> {cvRating.source || 'AI'}</p>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
