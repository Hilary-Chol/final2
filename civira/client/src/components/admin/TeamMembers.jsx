import '../../styles/admin.css';

// Team member management screen for searching profiles and maintaining panelists.

export default function TeamMembers({
  memberSearchQuery,
  setMemberSearchQuery,
  handleSearchMemberProfiles,
  searchingCandidates,
  memberCandidates,
  profileImageFromName,
  loading,
  teamMembers,
  handleRemoveTeamMember
}) {
  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Add Team Member</h1>
        <p className="info">Search panelist accounts across organizations. Organization name is included for easier filtering.</p>

        <div className="form" style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by full name, email, code, or organization"
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={handleSearchMemberProfiles} disabled={searchingCandidates}>
            {searchingCandidates ? 'Searching...' : 'Search Panelists'}
          </button>
        </div>

        {memberCandidates.length > 0 && (
          <div className="jobs-list" style={{ marginBottom: '28px' }}>
            {memberCandidates.map((candidate) => (
              <div key={candidate.id} className="job-item">
                <h3>{candidate.full_name}</h3>
                <p><strong>Email:</strong> {candidate.email}</p>
                <p><strong>Code:</strong> {candidate.user_code || '-'}</p>
                <p><strong>Role:</strong> {candidate.role || 'panelist'}</p>
                <p><strong>Organization:</strong> {candidate.organization_name || '-'}</p>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: '36px' }}>Current Team Members</h2>
        {teamMembers.length === 0 ? (
          <p className="empty-state">No team members added yet.</p>
        ) : (
          <div className="jobs-list" style={{ marginTop: '12px' }}>
            {teamMembers.map((member) => (
              <div key={member.id} className="job-item">
                <h3>{member.full_name}</h3>
                <p><strong>Email:</strong> {member.email}</p>
                <p><strong>Code:</strong> {member.user_code}</p>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loading}
                  onClick={() => handleRemoveTeamMember(member.id, member.full_name)}
                >
                  Remove Member
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
