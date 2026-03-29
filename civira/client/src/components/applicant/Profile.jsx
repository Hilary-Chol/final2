import { useState, useEffect } from 'react';
import { toKeywords } from '../../utils/helpers';
import { apiRequest, API_BASE_URL } from '../../services/api';
import '../../styles/applicant.css';
import Message from '../common/Message';

// Applicant profile editor for contact info, skills, and resume upload.

export default function ApplicantProfile({ applicant, loading, setLoading, message, setMessage, success, setSuccess, onProfileUpdate }) {
  const [form, setForm] = useState({
    phone: '',
    location: '',
    experienceLevel: 'entry',
    skills: ''
  });
  const [profileResume, setProfileResume] = useState(null);

  useEffect(() => {
    if (applicant) {
      setForm({
        phone: applicant.phone || '',
        location: applicant.location || '',
        experienceLevel: applicant.experienceLevel || 'entry',
        skills: Array.isArray(applicant.skills) ? applicant.skills.join(', ') : ''
      });
    }
  }, [applicant]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('phone', form.phone);
      formData.append('location', form.location);
      formData.append('experienceLevel', form.experienceLevel);
      formData.append('skills', JSON.stringify(toKeywords(form.skills)));
      if (profileResume) {
        formData.append('resume', profileResume);
      }

      const result = await apiRequest('/applicants/profile', {
        method: 'PUT',
        body: formData
      });
      
      const updatedApplicant = {
        ...applicant,
        phone: form.phone,
        location: form.location,
        experienceLevel: form.experienceLevel,
        skills: toKeywords(form.skills),
        resumeFileName: result.applicant?.resumeFileName || applicant.resumeFileName
      };
      
      localStorage.setItem('applicant_data', JSON.stringify(updatedApplicant));
      setProfileResume(null);
      setMessage('Profile updated successfully!');
      setSuccess(true);
      onProfileUpdate(updatedApplicant);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCv() {
    try {
      const token = localStorage.getItem('applicant_token');
      const response = await fetch(`${API_BASE_URL}/applicants/resume`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || 'Failed to download CV');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || applicant?.resumeFileName || 'my-cv';

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      setMessage('CV downloaded successfully.');
      setSuccess(true);
    } catch (error) {
      setMessage(error.message || 'Failed to download CV');
      setSuccess(false);
    }
  }

  return (
    <div className="page-content">
      <div className="content-container">
        <h1>My Profile</h1>
        <form onSubmit={handleSubmit} className="form">
          <Message message={message} success={success} />
          
          <p><strong>Email:</strong> {applicant?.email}</p>
          <p><strong>Name:</strong> {applicant?.fullName}</p>
          {applicant?.resumeFileName && <p><strong>Saved Resume:</strong> {applicant.resumeFileName}</p>}

          <input 
            type="tel" 
            placeholder="Phone" 
            value={form.phone} 
            onChange={(e) => setForm({...form, phone: e.target.value})} 
          />
          <input 
            type="text" 
            placeholder="Location" 
            value={form.location} 
            onChange={(e) => setForm({...form, location: e.target.value})} 
          />
          <select 
            value={form.experienceLevel} 
            onChange={(e) => setForm({...form, experienceLevel: e.target.value})}
          >
            <option value="entry">Entry Level</option>
            <option value="mid">Mid Level</option>
            <option value="senior">Senior</option>
            <option value="executive">Executive</option>
          </select>
          <textarea 
            placeholder="Skills (comma-separated)" 
            value={form.skills} 
            onChange={(e) => setForm({...form, skills: e.target.value})} 
            rows="3"
          />

          <div className="file-upload">
            <label>Upload/Update Resume</label>
            <input 
              type="file" 
              accept=".pdf,.docx,.txt" 
              onChange={(e) => setProfileResume(e.target.files?.[0] || null)} 
            />
            {profileResume && <p className="upload-status">✓ {profileResume.name}</p>}
          </div>

          <button type="button" className="btn-secondary" disabled={!applicant?.resumeFileName} onClick={handleDownloadCv}>
            Access My CV
          </button>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
