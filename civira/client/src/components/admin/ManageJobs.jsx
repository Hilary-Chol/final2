import React, { useState } from 'react';
import { apiRequest } from '../../services/api';
import { toKeywords, formatDate, hasDeadlinePassed } from '../../utils/helpers';
import '../../styles/admin.css';
import Message from '../common/Message';

// Job management screen for creating jobs and viewing active postings.

export default function ManageJobs({ jobs, loading, setLoading, message, setMessage, success, setSuccess, onJobsUpdate, onJobSelect, onNavigate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    criteria_keywords: '',
    applicationDeadline: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await apiRequest('/jobs', 'POST', {
        title: form.title,
        description: form.description,
        criteriaKeywords: toKeywords(form.criteria_keywords),
        applicationDeadline: form.applicationDeadline
      });
      
      setMessage('Job created successfully!');
      setSuccess(true);
      setForm({ title: '', description: '', criteria_keywords: '', applicationDeadline: '' });
      onJobsUpdate();
      onNavigate('admin-jobs');
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Manage Jobs</h1>
        <form onSubmit={handleSubmit} className="form">
          <Message message={message} success={success} />
          
          <input 
            type="text" 
            placeholder="Job Title" 
            value={form.title} 
            onChange={(e) => setForm({...form, title: e.target.value})} 
            required 
          />
          <textarea 
            placeholder="Job Description" 
            value={form.description} 
            onChange={(e) => setForm({...form, description: e.target.value})} 
            rows="4"
          />
          <input 
            type="text" 
            placeholder="Criteria Keywords (comma-separated)" 
            value={form.criteria_keywords} 
            onChange={(e) => setForm({...form, criteria_keywords: e.target.value})} 
          />
          <input 
            type="date" 
            value={form.applicationDeadline} 
            onChange={(e) => setForm({...form, applicationDeadline: e.target.value})} 
            required 
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </form>

        <h2 style={{ marginTop: '40px' }}>Active Jobs</h2>
        {jobs.length === 0 ? (
          <p className="empty-state">No jobs yet.</p>
        ) : (
          <div className="jobs-list">
            {jobs.map(job => (
              <div
                key={job.id}
                className="job-item clickable"
                onClick={() => {
                  onJobSelect(job);
                  onNavigate('admin-job-details');
                }}
              >
                <h3>{job.title}</h3>
                <p>{job.description || 'No description'}</p>
                <p><strong>Keywords:</strong> {Array.isArray(job.criteria_keywords) ? job.criteria_keywords.join(', ') : 'N/A'}</p>
                <p><strong>Deadline:</strong> {job.application_deadline ? formatDate(job.application_deadline) : 'Not set'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
