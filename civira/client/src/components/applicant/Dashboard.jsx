import '../../styles/applicant.css';

// Applicant dashboard listing submitted applications and shortlist status.

export default function ApplicantDashboard({ applications, onNavigate }) {
  function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="page-content">
      <div className="content-container">
        <h1>My Applications</h1>
        {applications.length === 0 ? (
          <p className="empty-state">
            No applications yet. <button className="btn-link" onClick={() => onNavigate('applicant-browse')}>Browse jobs</button>
          </p>
        ) : (
          <div className="applications-grid">
            {applications.map(app => (
              <div key={app.id} className="application-card">
                <h3>{app.job_title}</h3>
                <p><strong>Code:</strong> {app.candidate_code}</p>
                <p><strong>Applied:</strong> {formatDate(app.created_at)}</p>
                <p><strong>Job Status:</strong> {app.job_status || '-'}</p>
                <p><strong>Panel Reviews:</strong> {Number(app.score_count || 0)}</p>
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
  );
}
