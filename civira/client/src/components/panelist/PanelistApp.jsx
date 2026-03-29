import PanelistDashboard from './Dashboard';
import PanelistScoring from './Scoring';
import PanelistProfile from './Profile';

export default function PanelistApp({
  AccountIcon,
  currentPage,
  orgUser,
  handleLogout,
  setCurrentPage,
  panelJobId,
  jobs,
  handlePanelJobChange,
  shortlistedCandidates,
  scoreDrafts,
  setScoreDrafts,
  loading,
  drawnCandidate,
  interviewSession,
  handleDrawNextCandidate,
  handleSubmitScore,
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
          <p className="header-subtitle">Team Member Portal</p>
        </div>
        <div className="header-user">
          <button type="button" className="header-account-btn" onClick={() => setCurrentPage('panelist-profile')}>
            <span className="header-account"><AccountIcon /> {orgUser?.name}</span>
          </button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="app-nav">
        <button className={`nav-btn ${currentPage === 'panelist-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('panelist-dashboard')}>Dashboard</button>
        <button className={`nav-btn ${currentPage === 'panelist-scoring' ? 'active' : ''}`} onClick={() => setCurrentPage('panelist-scoring')}>Score Candidates</button>
      </nav>

      {currentPage === 'panelist-dashboard' && (
        <PanelistDashboard onNavigate={setCurrentPage} />
      )}

      {currentPage === 'panelist-scoring' && (
        <PanelistScoring
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
        />
      )}

      {currentPage === 'panelist-profile' && (
        <PanelistProfile
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
