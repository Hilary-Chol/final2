import { useState } from 'react';
import { apiRequest } from '../../services/api';
import '../../styles/auth.css';
import Message from '../common/Message';

// Unified login page for applicant, manager, and team member accounts.
// Backend determines account type by checking the submitted email.
export default function UnifiedLogin({ onNavigate, loading, setLoading, setMessage, setSuccess, message, success, onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await apiRequest('/auth/login', 'POST', form);

      if (result.accountType === 'organization') {
        const serverUser = result.user || {};
        const userData = {
          userId: serverUser.id,
          name: serverUser.fullName,
          email: serverUser.email,
          role: serverUser.role,
          organizationId: serverUser.organizationId,
          organizationName: serverUser.organizationName
        };

        localStorage.removeItem('applicant_token');
        localStorage.removeItem('applicant_data');
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('org_user_data', JSON.stringify(userData));

        setMessage(`Welcome, ${userData.role === 'admin' ? 'Manager' : 'Team Member'}!`);
        setSuccess(true);
        onSuccess({ accountType: 'organization', token: result.token, userData });
        return;
      }

      if (result.accountType === 'applicant') {
        const applicant = result.applicant || {};
        const applicantData = {
          applicantId: applicant.applicantId,
          fullName: applicant.fullName,
          email: applicant.email,
          phone: applicant.phone || '',
          location: applicant.location || '',
          experienceLevel: applicant.experienceLevel || 'entry',
          skills: Array.isArray(applicant.skills) ? applicant.skills : [],
          resumeFileName: applicant.resumeFileName || null
        };

        localStorage.removeItem('auth_token');
        localStorage.removeItem('org_user_data');
        localStorage.setItem('applicant_token', result.token);
        localStorage.setItem('applicant_data', JSON.stringify(applicantData));

        setMessage('Login successful!');
        setSuccess(true);
        onSuccess({ accountType: 'applicant', token: result.token, applicantData });
        return;
      }

      throw new Error('Unsupported account type returned by server');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-auth">
      <div className="auth-container">
        <h1 className="auth-page-brand">CIVIRA</h1>
        <div className="auth-card">
          <h2>Login</h2>
          <Message message={message} success={success} />
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="auth-link">
            Need an account? Applicant <button className="btn-link" onClick={() => onNavigate('applicant-register')}>Register</button> or Organization <button className="btn-link" onClick={() => onNavigate('org-register')}>Register</button> or Panelist <button className="btn-link" onClick={() => onNavigate('panelist-register')}>Register</button>
          </p>
        </div>
      </div>
    </div>
  );
}
