// Reusable organization/user profile form used by manager and team member pages.
export default function OrgProfileForm({
  orgProfileMeta,
  orgUser,
  orgProfileForm,
  setOrgProfileForm,
  orgProfileCv,
  setOrgProfileCv,
  loading,
  onSubmit
}) {
  return (
    <form onSubmit={onSubmit} className="form">
      <p><strong>Account Code:</strong> {orgProfileMeta.userCode || '-'}</p>
      <p><strong>Email:</strong> {orgUser?.email}</p>
      {orgProfileMeta.cvFileName && <p><strong>Current CV:</strong> {orgProfileMeta.cvFileName}</p>}

      <input
        type="text"
        placeholder="Full Name"
        value={orgProfileForm.fullName}
        onChange={(e) => setOrgProfileForm({ ...orgProfileForm, fullName: e.target.value })}
        required
      />
      <textarea
        rows="3"
        placeholder="Short Bio"
        value={orgProfileForm.bio}
        onChange={(e) => setOrgProfileForm({ ...orgProfileForm, bio: e.target.value })}
      />
      <textarea
        rows="3"
        placeholder="Experience (write your own experience details)"
        value={orgProfileForm.experience}
        onChange={(e) => setOrgProfileForm({ ...orgProfileForm, experience: e.target.value })}
      />
      <textarea
        rows="3"
        placeholder="Skills (comma-separated)"
        value={orgProfileForm.skills}
        onChange={(e) => setOrgProfileForm({ ...orgProfileForm, skills: e.target.value })}
      />

      <div className="file-upload">
        <label>Upload/Update CV</label>
        <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setOrgProfileCv(e.target.files?.[0] || null)} />
        {orgProfileCv && <p className="upload-status">✓ {orgProfileCv.name}</p>}
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</button>
    </form>
  );
}
