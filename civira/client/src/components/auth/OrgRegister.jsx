import { useState } from 'react';
import { apiRequest } from '../../services/api';
import '../../styles/auth.css';
import Message from '../common/Message';

// Organization registration form for creating a manager account.

export default function OrgRegister({ onSuccess, onNavigate, loading, setLoading, setMessage, setSuccess, message, success }) {
  const [form, setForm] = useState({
    organizationName: '',
    managerName: '',
    managerEmail: '',
    managerPassword: '',
    confirmPassword: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (form.managerPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSuccess(false);
      setLoading(false);
      return;
    }

    if (form.managerPassword !== form.confirmPassword) {
      setMessage('Password and confirm password do not match');
      setSuccess(false);
      setLoading(false);
      return;
    }

    try {
      const payload = awaitingVerification
        ? {
            organizationName: form.organizationName,
            managerName: form.managerName,
            managerEmail: form.managerEmail,
            managerPassword: form.managerPassword,
            verificationCode
          }
        : {
            organizationName: form.organizationName,
            managerName: form.managerName,
            managerEmail: form.managerEmail,
            managerPassword: form.managerPassword
          };

      const result = await apiRequest('/auth/register-organization', 'POST', payload);

      if (result.requiresVerification) {
        setAwaitingVerification(true);
        const helperCode = result.verificationCode ? ` Code: ${result.verificationCode}` : '';
        setMessage((result.message || 'Verification code sent to your email.') + helperCode);
        setSuccess(true);
        return;
      }

      setMessage('Organization registered! Account Code: ' + result.accountCode);
      setSuccess(true);
      
      setTimeout(() => {
        onNavigate('login');
      }, 2000);
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
          <h2>Register Organization</h2>
          <Message message={message} success={success} />
          <form onSubmit={handleSubmit}>
            <input 
              type="text" 
              placeholder="Organization Name" 
              value={form.organizationName} 
              onChange={(e) => setForm({...form, organizationName: e.target.value})} 
              required 
            />
            <input 
              type="text" 
              placeholder="Manager Name" 
              value={form.managerName} 
              onChange={(e) => setForm({...form, managerName: e.target.value})} 
              required 
            />
            <input 
              type="email" 
              placeholder="Manager Email" 
              value={form.managerEmail} 
              onChange={(e) => setForm({...form, managerEmail: e.target.value})} 
              required 
            />
            <input 
              type="password" 
              placeholder="Password (min 6 chars)" 
              value={form.managerPassword} 
              onChange={(e) => setForm({...form, managerPassword: e.target.value})} 
              required 
              minLength="6" 
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              minLength="6"
            />
            {awaitingVerification && (
              <input
                type="text"
                placeholder="Enter 6-digit verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Please wait...' : awaitingVerification ? 'Verify & Register' : 'Send Verification Code'}
            </button>
          </form>
          <p className="auth-link">
            Already registered? <button className="btn-link" onClick={() => onNavigate('login')}>Login</button>
          </p>
          <button className="btn-back" onClick={() => onNavigate('landing')}>← Back</button>
        </div>
      </div>
    </div>
  );
}
