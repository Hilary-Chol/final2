import '../../styles/panelist.css';

// Team member scoring interface with random interview draw order.

export default function PanelistScoring({
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
  handleSubmitScore
}) {
  const activeCandidateId = drawnCandidate ? Number(drawnCandidate.candidateId) : null;
  const activeDraft = activeCandidateId ? (scoreDrafts[activeCandidateId] || { score: '', notes: '' }) : { score: '', notes: '' };

  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Score Candidates</h1>
        <p className="info">On interview day, draw a random shortlisted candidate and submit score (0 to 65).</p>

        <select className="select" value={panelJobId} onChange={(e) => handlePanelJobChange(e.target.value)}>
          <option value="">Select a job</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>

        {!panelJobId ? (
          <p className="empty-state" style={{ marginTop: '20px' }}>Choose a job to start interview-day scoring.</p>
        ) : !interviewSession ? (
          <p className="empty-state" style={{ marginTop: '20px' }}>Interview session is not created yet for this job.</p>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <p><strong>Interview Status:</strong> {interviewSession.session?.status}</p>
            <button className="btn-primary" disabled={loading} onClick={handleDrawNextCandidate}>
              {loading ? 'Drawing...' : 'Draw Random Candidate'}
            </button>

            {drawnCandidate && (
              <div className="job-item" style={{ marginTop: '18px' }}>
                <h3>Current Candidate: {drawnCandidate.candidateCode}</h3>
                <p><strong>Name:</strong> {drawnCandidate.fullName}</p>
                <p><strong>Email:</strong> {drawnCandidate.email}</p>
                <input
                  type="number"
                  min="0"
                  max="65"
                  placeholder="Interview Score (0 - 65)"
                  value={activeDraft.score}
                  onChange={(e) => setScoreDrafts((prev) => ({
                    ...prev,
                    [activeCandidateId]: {
                      ...prev[activeCandidateId],
                      score: e.target.value
                    }
                  }))}
                />
                <textarea
                  rows="3"
                  placeholder="Notes (optional)"
                  value={activeDraft.notes || ''}
                  onChange={(e) => setScoreDrafts((prev) => ({
                    ...prev,
                    [activeCandidateId]: {
                      ...prev[activeCandidateId],
                      notes: e.target.value
                    }
                  }))}
                />
                <button className="btn-primary" disabled={loading} onClick={() => handleSubmitScore(activeCandidateId)}>
                  {loading ? 'Submitting...' : 'Submit Score'}
                </button>
              </div>
            )}

            {!drawnCandidate && shortlistedCandidates.length > 0 && (
              <p className="info" style={{ marginTop: '14px' }}>Ready candidates in shortlist: {shortlistedCandidates.length}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
