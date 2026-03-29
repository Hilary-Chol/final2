import '../../styles/panelist.css';

// Team member dashboard with navigation to candidate scoring.

export default function PanelistDashboard({ onNavigate }) {
  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Team Member Dashboard</h1>
        <p className="info">Review and score applicants for assigned jobs.</p>
        <button className="btn-primary" onClick={() => onNavigate('panelist-scoring')}>Score Candidates</button>
      </div>
    </div>
  );
}
