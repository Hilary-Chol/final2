import { hasDeadlinePassed } from '../../utils/helpers';
import '../../styles/applicant.css';

// Job browsing view for applicants with quick apply navigation.

export default function BrowseJobs({ jobs, onNavigate, onJobSelect }) {
  function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
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
                      onJobSelect(String(job.id));
                      onNavigate('applicant-apply');
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
  );
}
