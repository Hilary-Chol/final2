import AdminDashboard from './Dashboard';
import ManageJobs from './ManageJobs';
import JobDetails from './JobDetails';
import Shortlist from './Shortlist';
import InterviewManagement from './InterviewManagement';
import TeamMembers from './TeamMembers';
import AdminProfile from './Profile';

export default function AdminApp({
  AccountIcon,
  currentPage,
  orgUser,
  handleLogout,
  setCurrentPage,
  jobs,
  loading,
  setLoading,
  message,
  setMessage,
  success,
  setSuccess,
  fetchJobs,
  setSelectedJob,
  selectedJob,
  fetchShortlist,
  shortlistedCandidates,
  topCandidates,
  handleAdminShortlistJobChange,
  interviewSession,
  handleCreateInterviewSession,
  handleSendInterviewInvites,
  memberSearchQuery,
  setMemberSearchQuery,
  handleSearchMemberProfiles,
  searchingCandidates,
  memberCandidates,
  profileImageFromName,
  profileBio,
  parseSkillList,
  handleAddFromProfile,
  teamMembers,
  handleRemoveTeamMember,
  orgProfileMeta,
  orgProfileForm,
  setOrgProfileForm,
  orgProfileCv,
  setOrgProfileCv,
  handleUpdateOrgProfile
}) {
  return (
    <div className="app-page">
      <header className="app-header">
        <div className="header-content">
          <h1>CIVIRA</h1>
          <div className="header-user">
            <button type="button" className="header-account-btn" onClick={() => setCurrentPage('admin-profile')}>
              <span className="header-account"><AccountIcon /> {orgUser?.name}</span>
            </button>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button className={`nav-btn ${currentPage === 'admin-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-dashboard')}>Dashboard</button>
        <button className={`nav-btn ${currentPage === 'admin-jobs' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-jobs')}>Manage Jobs</button>
        <button className={`nav-btn ${currentPage === 'admin-shortlist' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-shortlist')}>Shortlist</button>
        <button className={`nav-btn ${currentPage === 'admin-interviews' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-interviews')}>Interviews</button>
        <button className={`nav-btn ${currentPage === 'admin-team' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-team')}>Team Members</button>
      </nav>

      {currentPage === 'admin-dashboard' && (
        <AdminDashboard jobs={jobs} onNavigate={setCurrentPage} />
      )}

      {currentPage === 'admin-jobs' && (
        <ManageJobs
          jobs={jobs}
          loading={loading}
          setLoading={setLoading}
          message={message}
          setMessage={setMessage}
          success={success}
          setSuccess={setSuccess}
          onJobsUpdate={fetchJobs}
          onJobSelect={setSelectedJob}
          onNavigate={setCurrentPage}
        />
      )}

      {currentPage === 'admin-job-details' && (
        <JobDetails
          selectedJob={selectedJob}
          onBack={() => setCurrentPage('admin-jobs')}
          onViewShortlist={() => {
            if (selectedJob?.id) {
              fetchShortlist(selectedJob.id);
            }
            setCurrentPage('admin-shortlist');
          }}
        />
      )}

      {currentPage === 'admin-shortlist' && (
        <Shortlist
          selectedJob={selectedJob}
          jobs={jobs}
          shortlistedCandidates={shortlistedCandidates}
          topCandidates={topCandidates}
          onJobChange={handleAdminShortlistJobChange}
        />
      )}

      {currentPage === 'admin-interviews' && (
        <InterviewManagement
          selectedJob={selectedJob}
          jobs={jobs}
          interviewSession={interviewSession}
          loading={loading}
          onJobChange={handleAdminShortlistJobChange}
          onCreateInterviewSession={handleCreateInterviewSession}
          onSendInterviewInvites={handleSendInterviewInvites}
        />
      )}

      {currentPage === 'admin-team' && (
        <TeamMembers
          memberSearchQuery={memberSearchQuery}
          setMemberSearchQuery={setMemberSearchQuery}
          handleSearchMemberProfiles={handleSearchMemberProfiles}
          searchingCandidates={searchingCandidates}
          memberCandidates={memberCandidates}
          profileImageFromName={profileImageFromName}
          profileBio={profileBio}
          parseSkillList={parseSkillList}
          loading={loading}
          handleAddFromProfile={handleAddFromProfile}
          teamMembers={teamMembers}
          handleRemoveTeamMember={handleRemoveTeamMember}
        />
      )}

      {currentPage === 'admin-profile' && (
        <AdminProfile
          orgProfileMeta={orgProfileMeta}
          orgUser={orgUser}
          orgProfileForm={orgProfileForm}
          setOrgProfileForm={setOrgProfileForm}
          orgProfileCv={orgProfileCv}
          setOrgProfileCv={setOrgProfileCv}
          loading={loading}
          handleUpdateOrgProfile={handleUpdateOrgProfile}
        />
      )}
    </div>
  );
}
