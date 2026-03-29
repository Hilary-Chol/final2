import '../../styles/admin.css';

// Manager dashboard with high-level actions and summary stats.

export default function AdminDashboard({ jobs, onNavigate }) {
  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Manager Dashboard</h1>
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>{jobs.length}</h3>
            <p>Active Jobs</p>
          </div>
        </div>
        <div className="admin-actions">
          <button className="btn-primary" onClick={() => onNavigate('admin-jobs')}>+ Create Job</button>
          <button className="btn-secondary" onClick={() => onNavigate('admin-shortlist')}>Review Shortlist</button>
          <button className="btn-secondary" onClick={() => onNavigate('admin-team')}>Add Team Member</button>
        </div>
      </div>
    </div>
  );
}
