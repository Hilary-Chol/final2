import { useState } from 'react';
import '../../styles/admin.css';

// Dedicated interview management page for admins.
// Flow: select job -> create interview session -> send invites -> monitor random order/status.
export default function InterviewManagement({
  selectedJob,
  jobs,
  interviewSession,
  loading,
  onJobChange,
  onCreateInterviewSession,
  onSendInterviewInvites
}) {
  const [interviewDate, setInterviewDate] = useState('');

  return (
    <div className="page-content">
      <div className="content-container">
        <h1>Interview Management</h1>
        <p className="info">Manage interview day setup, invitation sending, and random interview order.</p>

        <select value={selectedJob?.id || ''} onChange={(e) => onJobChange(e.target.value)} className="select">
          <option value="">Select a job</option>
          {jobs.map((job) => (<option key={job.id} value={job.id}>{job.title}</option>))}
        </select>

        {!selectedJob ? (
          <p className="empty-state" style={{ marginTop: '20px' }}>Select a job to manage interview day.</p>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {!interviewSession ? (
              <>
                <h2>Create Interview Session</h2>
                <div className="form" style={{ maxWidth: '440px', padding: 0, marginTop: '8px' }}>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    required
                  />
                  <button
                    className="btn-primary"
                    disabled={loading || !interviewDate}
                    onClick={() => onCreateInterviewSession(interviewDate)}
                  >
                    {loading ? 'Creating...' : 'Create Interview Session'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Session Details</h2>
                <p><strong>Interview Date:</strong> {interviewSession.session?.interview_date}</p>
                <p><strong>Status:</strong> {interviewSession.session?.status}</p>
                <p><strong>Total Candidates:</strong> {interviewSession.candidates?.length || 0}</p>
                <button className="btn-secondary" disabled={loading} onClick={onSendInterviewInvites}>
                  {loading ? 'Sending...' : 'Send Interview Invites'}
                </button>

                <div className="candidates-table" style={{ marginTop: '16px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Random Order</th>
                        <th>Candidate Code</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(interviewSession.candidates || []).map((candidate) => (
                        <tr key={candidate.candidateId}>
                          <td>#{candidate.randomOrder}</td>
                          <td>{candidate.candidateCode}</td>
                          <td>{candidate.fullName}</td>
                          <td>{candidate.email}</td>
                          <td>{candidate.inviteStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
