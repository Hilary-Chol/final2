import pool from '../config/db.js';
import { saveAuditLog } from '../services/auditService.js';
import { sendSelectionEmailToCandidate } from '../services/emailService.js';
import { getOrganizationNameColumn } from '../utils/organizationNameColumn.js';

// Exported to: server/src/routes/scoreRoutes.js -> router.post('/', requireAuth, requireRole('panelist'), submitPanelScore)
export async function submitPanelScore(req, res) {
  try {
    const { jobId, candidateId, score, notes } = req.body;
    const { userId, organizationId } = req.user;
    const numericScore = Number(score);

    // This API saves each panelist score independently (one score per panelist per candidate).
    if (!jobId || !candidateId || Number.isNaN(numericScore)) {
      return res.status(400).json({ message: 'jobId, candidateId and numeric score are required' });
    }

    if (numericScore < 0 || numericScore > 65) {
      return res.status(400).json({ message: 'Interview score must be between 0 and 65' });
    }

    const [validRows] = await pool.query(
      `SELECT c.id, c.candidate_code
       FROM candidates c
       JOIN jobs j ON j.id = c.job_id
       JOIN shortlists s ON s.candidate_id = c.id AND s.job_id = c.job_id
       WHERE c.id = ? AND c.job_id = ? AND j.organization_id = ?
       LIMIT 1`,
      [candidateId, jobId, organizationId]
    );

    if (!validRows.length) {
      return res.status(404).json({ message: 'Candidate not found in shortlisted list for this job' });
    }

    const [sessionRows] = await pool.query(
      `SELECT s.id AS session_id, ii.invite_status
       FROM interview_sessions s
       LEFT JOIN interview_invites ii ON ii.interview_session_id = s.id AND ii.candidate_id = ?
       WHERE s.job_id = ?
       LIMIT 1`,
      [candidateId, jobId]
    );

    if (sessionRows.length && !sessionRows[0].invite_status) {
      // If a session exists, only invited candidates can be scored.
      return res.status(400).json({ message: 'Candidate is not included in this job interview session' });
    }

    await pool.query(
      `INSERT INTO panel_scores (job_id, candidate_id, panelist_id, score, notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score), notes = VALUES(notes)`,
      [jobId, candidateId, userId, numericScore, notes || '']
    );

    await pool.query(
      `UPDATE interview_invites ii
       JOIN interview_sessions s ON s.id = ii.interview_session_id
       SET ii.invite_status = 'interviewed', ii.interviewed_at = CURRENT_TIMESTAMP
       WHERE s.job_id = ? AND ii.candidate_id = ?`,
      [jobId, candidateId]
    );

    // Candidate lifecycle is advanced after at least one panel score is submitted.
    await pool.query(
      `UPDATE candidates
       SET application_status = 'interviewed'
       WHERE id = ? AND job_id = ?`,
      [candidateId, jobId]
    );

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'PANEL_SCORE_SUBMITTED',
      targetType: 'candidate',
      targetId: candidateId,
      details: { jobId, score: numericScore }
    });

    return res.status(200).json({ message: 'Score submitted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/scoreRoutes.js -> router.get('/final-selection/:jobId', requireAuth, getFinalSelection)
export async function getFinalSelection(req, res) {
  try {
    const { jobId } = req.params;
    const { organizationId, userId } = req.user;
    const organizationNameColumn = await getOrganizationNameColumn();

    // This API calculates total panel scores and returns the highest-scoring shortlisted candidate.
    const [rows] = await pool.query(
      `SELECT c.id AS candidate_id, c.candidate_code, c.full_name, c.email,
              j.title AS job_title,
              o.${organizationNameColumn} AS organization_name,
              SUM(ps.score) AS total_score, AVG(ps.score) AS avg_score
       FROM panel_scores ps
       JOIN candidates c ON c.id = ps.candidate_id
       JOIN jobs j ON j.id = ps.job_id
       JOIN organizations o ON o.id = j.organization_id
       JOIN shortlists s ON s.candidate_id = c.id AND s.job_id = ps.job_id
       WHERE ps.job_id = ? AND j.organization_id = ?
       GROUP BY c.id, c.candidate_code, c.full_name, c.email, j.title, o.${organizationNameColumn}
       ORDER BY total_score DESC
       LIMIT 1`,
      [jobId, organizationId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'No panel scores available yet' });
    }

    const selectedCandidate = rows[0];

    const [emailAuditRows] = await pool.query(
      `SELECT id
       FROM audit_logs
       WHERE action = 'FINAL_SELECTION_EMAIL_SENT' AND target_type = 'candidate' AND target_id = ?
       LIMIT 1`,
      [selectedCandidate.candidate_id]
    );

    let email = { skipped: true, message: 'Selection email already sent.' };
    if (!emailAuditRows.length) {
      email = await sendSelectionEmailToCandidate({
        to: selectedCandidate.email,
        candidateName: selectedCandidate.full_name,
        jobTitle: selectedCandidate.job_title,
        organizationName: selectedCandidate.organization_name,
        totalScore: selectedCandidate.total_score,
        candidateCode: selectedCandidate.candidate_code
      });

      await saveAuditLog({
        organizationId,
        actorUserId: userId,
        action: 'FINAL_SELECTION_EMAIL_SENT',
        targetType: 'candidate',
        targetId: selectedCandidate.candidate_id,
        details: {
          email: selectedCandidate.email,
          jobId: Number(jobId),
          emailSkipped: Boolean(email.skipped)
        }
      });
    }

    return res.status(200).json({ selectedCandidate, email });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/scoreRoutes.js -> router.get('/top-candidates/:jobId', requireAuth, requireRole('admin'), getTopCandidatesWithFeedback)
export async function getTopCandidatesWithFeedback(req, res) {
  try {
    const { jobId } = req.params;
    const { organizationId } = req.user;

    const [topRows] = await pool.query(
      `SELECT c.id AS candidate_id, c.candidate_code, c.full_name, c.email,
              SUM(ps.score) AS total_score, AVG(ps.score) AS avg_score, COUNT(ps.id) AS feedback_count
       FROM panel_scores ps
       JOIN candidates c ON c.id = ps.candidate_id
       JOIN jobs j ON j.id = ps.job_id
       JOIN shortlists s ON s.candidate_id = c.id AND s.job_id = ps.job_id
       WHERE ps.job_id = ? AND j.organization_id = ?
       GROUP BY c.id, c.candidate_code, c.full_name, c.email
       ORDER BY total_score DESC
       LIMIT 3`,
      [jobId, organizationId]
    );

    if (!topRows.length) {
      return res.status(200).json({ topCandidates: [] });
    }

    const candidateIds = topRows.map((row) => Number(row.candidate_id));
    const [feedbackRows] = await pool.query(
      `SELECT ps.candidate_id, ps.score, ps.notes, ps.created_at,
              u.full_name AS team_member_name, u.email AS team_member_email
       FROM panel_scores ps
       JOIN users u ON u.id = ps.panelist_id
       WHERE ps.job_id = ? AND ps.candidate_id IN (?)
       ORDER BY ps.candidate_id ASC, ps.created_at DESC`,
      [jobId, candidateIds]
    );

    const feedbackByCandidate = new Map();
    for (const row of feedbackRows) {
      const key = Number(row.candidate_id);
      const existing = feedbackByCandidate.get(key) || [];
      existing.push({
        score: Number(row.score),
        notes: row.notes || '',
        createdAt: row.created_at,
        teamMemberName: row.team_member_name,
        teamMemberEmail: row.team_member_email
      });
      feedbackByCandidate.set(key, existing);
    }

    const topCandidates = topRows.map((row, index) => ({
      rank: index + 1,
      candidateId: Number(row.candidate_id),
      candidateCode: row.candidate_code,
      fullName: row.full_name,
      email: row.email,
      totalScore: Number(row.total_score),
      averageScore: Number(row.avg_score),
      feedbackCount: Number(row.feedback_count),
      feedback: feedbackByCandidate.get(Number(row.candidate_id)) || []
    }));

    return res.status(200).json({ topCandidates });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
