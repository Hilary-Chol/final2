import { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { toKeywords, hasDeadlinePassed, formatDate } from '../../utils/helpers';
import '../../styles/applicant.css';
import Message from '../common/Message';

// Application submission form with optional AI CV rating feedback.

export default function ApplyForJob({ jobs, selectedJobId, applicant, loading, setLoading, message, setMessage, success, setSuccess, onNavigate, onApplySuccess }) {
  const [form, setForm] = useState({
    jobId: selectedJobId || '',
    profileKeywords: ''
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [cvRating, setCvRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    if (form.jobId) {
      const job = jobs.find(j => String(j.id) === String(form.jobId));
      setSelectedJob(job || null);
    } else {
      setSelectedJob(null);
    }
  }, [form.jobId, jobs]);

  async function handleRateResume() {
    if (!applicant?.resumeFileName) {
      setMessage('Please upload a resume first');
      setSuccess(false);
      return;
    }

    setRatingLoading(true);
    try {
      const query = form.jobId ? `?jobId=${encodeURIComponent(form.jobId)}` : '';
      const rating = await apiRequest(`/applicants/cv-feedback${query}`);
      setCvRating(rating);
      
      setMessage(`Resume rated: ${rating.rating}/10 - ${rating.reasoning}`);
      setSuccess(true);
    } catch (error) {
      setMessage('Failed to rate resume: ' + error.message);
      setSuccess(false);
    } finally {
      setRatingLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const targetJob = jobs.find((job) => String(job.id) === String(form.jobId));
      if (targetJob && hasDeadlinePassed(targetJob.application_deadline)) {
        setMessage('Application deadline has passed for this job.');
        setSuccess(false);
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('jobId', form.jobId);
      formData.append('profileKeywords', JSON.stringify(toKeywords(form.profileKeywords)));

      const response = await fetch('/api/candidates/apply', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('applicant_token')}` },
        body: formData
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      
      const msg = result.usedSavedResume 
        ? `Application submitted! Code: ${result.candidateCode}. Your saved resume was used.`
        : `Application submitted! Code: ${result.candidateCode}`;
      const shortlistMsg = result.shortlisted
        ? ` You are currently shortlisted at rank #${result.rankPosition}.`
        : ' Your application is received and under review for shortlist.';
      
      setMessage(msg + shortlistMsg);
      setSuccess(true);
      setForm({ jobId: '', profileKeywords: '' });
      setCvRating(null);
      onApplySuccess();
      onNavigate('applicant-dashboard');
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
        <h1>Submit Application</h1>
        <form onSubmit={handleSubmit} className="form">
          <Message message={message} success={success} />
          
          <select 
            value={form.jobId} 
            onChange={(e) => setForm({...form, jobId: e.target.value})} 
            required
          >
            <option value="">Select a Job</option>
            {jobs.map(j => {
              const expired = hasDeadlinePassed(j.application_deadline);
              const disabled = j.status !== 'open' || expired;
              return (
                <option key={j.id} value={j.id} disabled={disabled}>
                  {j.title}{disabled ? ' (Closed)' : ''}
                </option>
              );
            })}
          </select>

          {selectedJob && (
            <div className="job-preview">
              <h2>{selectedJob.title}</h2>
              <p>{selectedJob.description}</p>
              <p><strong>Keywords:</strong> {Array.isArray(selectedJob.criteria_keywords) ? selectedJob.criteria_keywords.join(', ') : 'N/A'}</p>
              <p><strong>Deadline:</strong> {selectedJob.application_deadline ? formatDate(selectedJob.application_deadline) : 'Not set'}</p>
              {hasDeadlinePassed(selectedJob.application_deadline) && (
                <p className="message error" style={{ marginTop: '8px' }}>This deadline has passed. You cannot apply to this job.</p>
              )}
            </div>
          )}

          <textarea 
            placeholder="Your Keywords (comma-separated)" 
            value={form.profileKeywords} 
            onChange={(e) => setForm({...form, profileKeywords: e.target.value})} 
            rows="3"
          />

          {applicant?.resumeFileName && <p className="info">✓ Saved resume: {applicant.resumeFileName}</p>}

          <button 
            type="button" 
            className="btn-secondary" 
            disabled={ratingLoading || !applicant?.resumeFileName}
            onClick={handleRateResume}
          >
            {ratingLoading ? 'Rating Resume...' : '📊 Rate My Resume with AI'}
          </button>

          {cvRating && (
            <div className="cv-rating-result">
              <h3>Resume Rating: {cvRating.rating}/10</h3>
              <p><strong>Strengths:</strong> {cvRating.strengths.join(', ')}</p>
              <p><strong>Improvements:</strong> {cvRating.improvements.join(', ')}</p>
              <p><small>({cvRating.source})</small></p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || (selectedJob && hasDeadlinePassed(selectedJob.application_deadline))}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
