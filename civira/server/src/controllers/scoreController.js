import pool from '../config/db.js';
import { saveAuditLog } from '../services/auditService.js';
import { sendSelectionEmailToCandidate } from '../services/emailService.js';
import { getOrganizationNameColumn } from '../utils/organizationNameColumn.js';

export async function submitPanelScore(req, res) {
  try {
    const { jobId, candidateId, score, notes } = req.body;
    const { userId, organizationId } = req.user;

    // This API saves each panelist score independently (one score per panelist per candidate).
    if (!jobId || !candidateId || typeof score !== 'number') {
      return res.status(400).json({ message: 'jobId, candidateId and numeric score are required' });
    }

    await pool.query(
      `INSERT INTO panel_scores (job_id, candidate_id, panelist_id, score, notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score), notes = VALUES(notes)`,
      [jobId, candidateId, userId, score, notes || '']
    );

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'PANEL_SCORE_SUBMITTED',
      targetType: 'candidate',
      targetId: candidateId,
      details: { jobId, score }
    });

    return res.status(200).json({ message: 'Score submitted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

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
