import { useState } from 'react';
import { apiRequest } from '../../services/api';
import '../../styles/auth.css';
import Message from '../common/Message';

export default function PanelistRegister({ onNavigate, loading, setLoading, setMessage, setSuccess, message, success }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountCode: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (form.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSuccess(false);
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('Password and confirm password do not match');
      setSuccess(false);
      setLoading(false);
      return;
    }

    try {
      const payload = awaitingVerification
        ? {
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            accountCode: form.accountCode,
            verificationCode
          }
        : {
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            accountCode: form.accountCode
          };

      const result = await apiRequest('/auth/panelists/register', 'POST', payload);

      if (result.requiresVerification) {
        setAwaitingVerification(true);
        const helperCode = result.verificationCode ? ` Code: ${result.verificationCode}` : '';
        setMessage((result.message || 'Verification code sent to your email.') + helperCode);
        setSuccess(true);
        return;
      }

      setMessage('Panelist account created successfully. You can now login.');
      setSuccess(true);
      setTimeout(() => onNavigate('login'), 1200);
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
          <h2>Register as Panelist</h2>
          <Message message={message} success={success} />
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full Name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength="6"
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              minLength="6"
              required
            />
            <input
              type="text"
              placeholder="Organization Account Code"
              value={form.accountCode}
              onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
              required
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
              {loading ? 'Please wait...' : awaitingVerification ? 'Verify & Create Account' : 'Send Verification Code'}
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
