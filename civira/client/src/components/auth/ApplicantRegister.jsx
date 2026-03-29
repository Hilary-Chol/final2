import { useState } from 'react';
import { apiRequest } from '../../services/api';
import '../../styles/auth.css';
import Message from '../common/Message';

// Applicant registration form for creating a new job-seeker account.

export default function ApplicantRegister({ onSuccess, onNavigate, loading, setLoading, setMessage, setSuccess, message, success }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: ''
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
            phone: form.phone,
            location: form.location,
            verificationCode
          }
        : {
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            phone: form.phone,
            location: form.location
          };

      const result = await apiRequest('/applicants/register', 'POST', payload);

      if (result.requiresVerification) {
        setAwaitingVerification(true);
        const helperCode = result.verificationCode ? ` Code: ${result.verificationCode}` : '';
        setMessage((result.message || 'Verification code sent to your email.') + helperCode);
        setSuccess(true);
        return;
      }

      const applicantData = {
        applicantId: result.applicantId,
        fullName: form.fullName,
        email: result.email,
        phone: form.phone || '',
        location: form.location || '',
        experienceLevel: 'entry',
        skills: [],
        resumeFileName: null
      };
      
      localStorage.setItem('applicant_token', result.token);
      localStorage.setItem('applicant_data', JSON.stringify(applicantData));

      setMessage('Account created successfully. You can now login with your password.');
      setSuccess(true);
      onSuccess(result.token, applicantData);
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
          <h2>Create Applicant Account</h2>
          <Message message={message} success={success} />
          <form onSubmit={handleSubmit}>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={form.fullName} 
              onChange={(e) => setForm({...form, fullName: e.target.value})} 
              required 
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={form.email} 
              onChange={(e) => setForm({...form, email: e.target.value})} 
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
              type="tel" 
              placeholder="Phone (optional)" 
              value={form.phone} 
              onChange={(e) => setForm({...form, phone: e.target.value})} 
            />
            <input 
              type="text" 
              placeholder="Location (optional)" 
              value={form.location} 
              onChange={(e) => setForm({...form, location: e.target.value})} 
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
            Already have an account? <button className="btn-link" onClick={() => onNavigate('login')}>Login</button>
          </p>
          <button className="btn-back" onClick={() => onNavigate('landing')}>← Back</button>
        </div>
      </div>
    </div>
  );
}
