import OrgProfileForm from '../common/OrgProfileForm';
import '../../styles/admin.css';

// Manager profile page wrapper that reuses the organization profile form.

export default function AdminProfile(props) {
  const {
    orgProfileMeta,
    orgUser,
    orgProfileForm,
    setOrgProfileForm,
    orgProfileCv,
    setOrgProfileCv,
    loading,
    handleUpdateOrgProfile
  } = props;

  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Profile Details</h1>
        <p className="info">Update your profile, CV, skills, and your own written experience details.</p>
        <OrgProfileForm
          orgProfileMeta={orgProfileMeta}
          orgUser={orgUser}
          orgProfileForm={orgProfileForm}
          setOrgProfileForm={setOrgProfileForm}
          orgProfileCv={orgProfileCv}
          setOrgProfileCv={setOrgProfileCv}
          loading={loading}
          onSubmit={handleUpdateOrgProfile}
        />
      </div>
    </div>
  );
}
