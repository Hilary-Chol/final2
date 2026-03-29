import Landing from '../Landing';
import UnifiedLoginPage from '../auth/Login';
import ApplicantRegisterPage from '../auth/ApplicantRegister';
import OrgRegisterPage from '../auth/OrgRegister';
import PanelistRegisterPage from '../auth/PanelistRegister';

export default function GuestRoutes({
  currentPage,
  loading,
  setLoading,
  message,
  setMessage,
  success,
  setSuccess,
  setCurrentPage,
  onAuthSuccess,
  setApplicantToken,
  setApplicant
}) {
  if (currentPage === 'landing') {
    return <Landing onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'login' || currentPage === 'applicant-login' || currentPage === 'org-login') {
    return (
      <UnifiedLoginPage
        onNavigate={setCurrentPage}
        loading={loading}
        setLoading={setLoading}
        message={message}
        setMessage={setMessage}
        success={success}
        setSuccess={setSuccess}
        onSuccess={onAuthSuccess}
      />
    );
  }

  if (currentPage === 'applicant-register') {
    return (
      <ApplicantRegisterPage
        onNavigate={setCurrentPage}
        loading={loading}
        setLoading={setLoading}
        message={message}
        setMessage={setMessage}
        success={success}
        setSuccess={setSuccess}
        onSuccess={(token, applicantData) => {
          setApplicantToken(token);
          setApplicant(applicantData);
          setCurrentPage('applicant-dashboard');
        }}
      />
    );
  }

  if (currentPage === 'org-register') {
    return (
      <OrgRegisterPage
        onNavigate={setCurrentPage}
        loading={loading}
        setLoading={setLoading}
        message={message}
        setMessage={setMessage}
        success={success}
        setSuccess={setSuccess}
      />
    );
  }

  if (currentPage === 'panelist-register') {
    return (
      <PanelistRegisterPage
        onNavigate={setCurrentPage}
        loading={loading}
        setLoading={setLoading}
        message={message}
        setMessage={setMessage}
        success={success}
        setSuccess={setSuccess}
      />
    );
  }

  return null;
}
