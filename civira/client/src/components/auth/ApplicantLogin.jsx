import { useState } from 'react';
import { apiRequest } from '../../services/api';
import '../../styles/auth.css';
import Message from '../common/Message';

// Applicant authentication form for signing into the platform.

export default function ApplicantLogin({ onSuccess, onNavigate, loading, setLoading, setMessage, setSuccess, message, success }) {
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const result = await apiRequest('/applicants/login', 'POST', form);
      const applicantData = {
        applicantId: result.applicantId,
        fullName: result.fullName,
        email: result.email,
        phone: result.phone || '',
        location: result.location || '',
        experienceLevel: result.experienceLevel || 'entry',
        skills: Array.isArray(result.skills) ? result.skills : (result.skills ? JSON.parse(result.skills) : []),
        resumeFileName: result.resumeFileName || null
      };
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('org_user_data');
      localStorage.setItem('applicant_token', result.token);
      localStorage.setItem('applicant_data', JSON.stringify(applicantData));
      
      setMessage('Login successful!');
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
          <h2>Applicant Login</h2>
          <Message message={message} success={success} />
          <form onSubmit={handleSubmit}>
            <input 
              type="email" 
              placeholder="Email" 
              value={form.email} 
              onChange={(e) => setForm({...form, email: e.target.value})} 
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={form.password} 
              onChange={(e) => setForm({...form, password: e.target.value})} 
              required 
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="auth-link">
            Don't have an account? <button className="btn-link" onClick={() => onNavigate('applicant-register')}>Register</button>
          </p>
          <button className="btn-back" onClick={() => onNavigate('landing')}>← Back</button>
        </div>
      </div>
    </div>
  );
}
