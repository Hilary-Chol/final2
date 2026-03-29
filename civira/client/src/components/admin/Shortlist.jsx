import '../../styles/admin.css';

// Manager shortlist view with ranking list and top interview score summaries.

export default function Shortlist({
  selectedJob,
  jobs,
  shortlistedCandidates,
  topCandidates,
  onJobChange
}) {
  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Shortlist Management</h1>
        <select value={selectedJob?.id || ''} onChange={(e) => onJobChange(e.target.value)} className="select">
          <option value="">Select a job</option>
          {jobs.map((job) => (<option key={job.id} value={job.id}>{job.title}</option>))}
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
                      <th>Status</th>
                      <th>Panel Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortlistedCandidates.map((cand, idx) => (
                      <tr key={cand.candidate_id}>
                        <td>#{idx + 1}</td>
                        <td>{cand.full_name}</td>
                        <td>{cand.candidate_code}</td>
                        <td>{cand.email}</td>
                        <td>{parseFloat(cand.ranking_score).toFixed(2)}</td>
                        <td>{cand.application_status || '-'}</td>
                        <td>{Number(cand.score_count || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedJob && (
          <div style={{ marginTop: '32px' }}>
            <h2>Top 3 by Interview Score</h2>
            {topCandidates.length === 0 ? (
              <p className="empty-state">No interview scores submitted yet.</p>
            ) : (
              <div className="jobs-list">
                {topCandidates.map((candidate) => (
                  <div key={candidate.candidateId} className="job-item">
                    <h3>#{candidate.rank} {candidate.fullName} ({candidate.candidateCode})</h3>
                    <p><strong>Email:</strong> {candidate.email}</p>
                    <p><strong>Total Score:</strong> {candidate.totalScore.toFixed(2)} | <strong>Average:</strong> {candidate.averageScore.toFixed(2)}</p>
                    <p><strong>Feedback Count:</strong> {candidate.feedbackCount}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
