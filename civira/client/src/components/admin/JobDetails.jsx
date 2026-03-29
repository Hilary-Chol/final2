import '../../styles/admin.css';
import { formatDate } from '../../utils/helpers';

// Detailed manager view for a selected job posting.

export default function JobDetails({ selectedJob, onBack, onViewShortlist }) {
  return (
    <div className="page-content">
      <div className="content-container">
        {!selectedJob ? (
          <p className="empty-state">No job selected. <button className="btn-link" onClick={onBack}>Back to Active Jobs</button></p>
        ) : (
          <>
            <h1>{selectedJob.title}</h1>
            <p className="info">Detailed view for selected active job.</p>
            <div className="job-item" style={{ marginTop: '16px' }}>
              <p><strong>Description:</strong> {selectedJob.description || 'No description provided.'}</p>
              <p><strong>Keywords:</strong> {Array.isArray(selectedJob.criteria_keywords) ? selectedJob.criteria_keywords.join(', ') : 'N/A'}</p>
              <p><strong>Deadline:</strong> {selectedJob.application_deadline ? formatDate(selectedJob.application_deadline) : 'Not set'}</p>
              <p><strong>Status:</strong> {selectedJob.status || 'open'}</p>
            </div>
            <div className="admin-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={onBack}>← Back to Active Jobs</button>
              <button className="btn-primary" onClick={onViewShortlist}>View Shortlist</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
