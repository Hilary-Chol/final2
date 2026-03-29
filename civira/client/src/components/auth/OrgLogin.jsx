import { useState } from 'react';
import { apiRequest } from '../../services/api';
import '../../styles/auth.css';
import Message from '../common/Message';

// Organization login form for managers and team members.

export default function OrgLogin({ onSuccess, onNavigate, loading, setLoading, setMessage, setSuccess, message, success }) {
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await apiRequest('/auth/login', 'POST', form);
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
      onSuccess(result.token, userData);
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
          <h2>Organization Login</h2>
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
            New organization? <button className="btn-link" onClick={() => onNavigate('org-register')}>Register</button>
          </p>
          <button className="btn-back" onClick={() => onNavigate('landing')}>← Back</button>
        </div>
      </div>
    </div>
  );
}
