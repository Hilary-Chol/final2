import crypto from 'crypto';
import pool from '../config/db.js';
import { saveAuditLog } from '../services/auditService.js';
import { sendInterviewInviteEmailToCandidate } from '../services/emailService.js';

function shuffleCandidates(candidates) {
  // Fisher-Yates shuffle gives an unbiased random order for interview calling sequence.
  const items = [...candidates];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}

function isPastDeadline(deadline) {
  if (!deadline) {
    return false;
  }

  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  date.setHours(23, 59, 59, 999);
  return Date.now() > date.getTime();
}

// Exported to: server/src/routes/interviewRoutes.js -> router.post('/jobs/:jobId/session', requireAuth, requireRole('admin'), createInterviewSession)
export async function createInterviewSession(req, res) {
  try {
    const { jobId } = req.params;
    const { interviewDate } = req.body;
    const { organizationId, userId } = req.user;

    if (!interviewDate) {
      return res.status(400).json({ message: 'interviewDate is required (YYYY-MM-DD)' });
    }

    const [jobRows] = await pool.query(
      `SELECT id, title, application_deadline
       FROM jobs
       WHERE id = ? AND organization_id = ?`,
      [jobId, organizationId]
    );

    if (!jobRows.length) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!isPastDeadline(jobRows[0].application_deadline)) {
      return res.status(400).json({ message: 'Interview session can only be created after the application deadline' });
    }

    const [existingSessionRows] = await pool.query(
      'SELECT id, status, interview_date FROM interview_sessions WHERE job_id = ? LIMIT 1',
      [jobId]
    );

    if (existingSessionRows.length) {
      return res.status(409).json({ message: 'Interview session already exists for this job', session: existingSessionRows[0] });
    }

    const [shortlistedRows] = await pool.query(
      `SELECT s.candidate_id, c.candidate_code, c.full_name, c.email
       FROM shortlists s
       JOIN candidates c ON c.id = s.candidate_id
       WHERE s.job_id = ?
       ORDER BY s.rank_position ASC`,
      [jobId]
    );

    if (!shortlistedRows.length) {
      return res.status(400).json({ message: 'No shortlisted candidates found for this job' });
    }

    // We randomize once and persist order so interview fairness can be audited later.
    const randomized = shuffleCandidates(shortlistedRows);
    const randomSeed = crypto.randomBytes(12).toString('hex');

    const [sessionResult] = await pool.query(
      `INSERT INTO interview_sessions (job_id, organization_id, interview_date, status, random_seed, created_by)
       VALUES (?, ?, ?, 'scheduled', ?, ?)`,
      [jobId, organizationId, interviewDate, randomSeed, userId]
    );

    const sessionId = Number(sessionResult.insertId);

    for (let index = 0; index < randomized.length; index += 1) {
      const candidate = randomized[index];
      await pool.query(
        `INSERT INTO interview_invites (interview_session_id, job_id, candidate_id, random_order, invite_status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [sessionId, jobId, Number(candidate.candidate_id), index + 1]
      );
    }

    await pool.query(
      `UPDATE candidates
       SET application_status = 'interview_invited'
       WHERE job_id = ? AND id IN (
         SELECT candidate_id
         FROM shortlists
         WHERE job_id = ?
       )`,
      [jobId, jobId]
    );

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'INTERVIEW_SESSION_CREATED',
      targetType: 'job',
      targetId: Number(jobId),
      details: {
        interviewDate,
        shortlistedCount: randomized.length,
        sessionId
      }
    });

    return res.status(201).json({
      message: 'Interview session created',
      sessionId,
      interviewDate,
      candidateCount: randomized.length
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/interviewRoutes.js -> router.get('/jobs/:jobId/session', requireAuth, getInterviewSession)
export async function getInterviewSession(req, res) {
  try {
    const { jobId } = req.params;
    const { organizationId } = req.user;

    const [sessionRows] = await pool.query(
      `SELECT id, interview_date, status, created_at, started_at, completed_at
       FROM interview_sessions
       WHERE job_id = ? AND organization_id = ?
       LIMIT 1`,
      [jobId, organizationId]
    );

    if (!sessionRows.length) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    const session = sessionRows[0];
    const [inviteRows] = await pool.query(
      `SELECT ii.candidate_id, ii.random_order, ii.invite_status, ii.invited_at, ii.drawn_at, ii.interviewed_at,
              c.candidate_code, c.full_name, c.email
       FROM interview_invites ii
       JOIN candidates c ON c.id = ii.candidate_id
       WHERE ii.interview_session_id = ?
       ORDER BY ii.random_order ASC`,
      [session.id]
    );

    return res.status(200).json({
      session,
      candidates: inviteRows.map((row) => ({
        candidateId: Number(row.candidate_id),
        candidateCode: row.candidate_code,
        fullName: row.full_name,
        email: row.email,
        randomOrder: Number(row.random_order),
        inviteStatus: row.invite_status,
        invitedAt: row.invited_at,
        drawnAt: row.drawn_at,
        interviewedAt: row.interviewed_at
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/interviewRoutes.js -> router.post('/jobs/:jobId/send-invites', requireAuth, requireRole('admin'), sendInterviewInvites)
export async function sendInterviewInvites(req, res) {
  try {
    const { jobId } = req.params;
    const { organizationId, userId } = req.user;

    const [sessionRows] = await pool.query(
      `SELECT s.id, s.interview_date, j.title
       FROM interview_sessions s
       JOIN jobs j ON j.id = s.job_id
       WHERE s.job_id = ? AND s.organization_id = ?
       LIMIT 1`,
      [jobId, organizationId]
    );

    if (!sessionRows.length) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    const session = sessionRows[0];

    const [candidateRows] = await pool.query(
      `SELECT ii.id AS invite_id, ii.candidate_id, c.full_name, c.email, c.candidate_code
       FROM interview_invites ii
       JOIN candidates c ON c.id = ii.candidate_id
       WHERE ii.interview_session_id = ? AND ii.invite_status IN ('pending', 'sent')
       ORDER BY ii.random_order ASC`,
      [session.id]
    );

    if (!candidateRows.length) {
      return res.status(200).json({ message: 'No pending invites to send', sent: 0, failed: 0 });
    }

    let sent = 0;
    let failed = 0;

    // Each invite is attempted independently so one email failure does not stop the batch.
    for (const candidate of candidateRows) {
      try {
        await sendInterviewInviteEmailToCandidate({
          to: candidate.email,
          candidateName: candidate.full_name,
          jobTitle: session.title,
          interviewDate: session.interview_date,
          candidateCode: candidate.candidate_code
        });

        await pool.query(
          `UPDATE interview_invites
           SET invite_status = 'sent', invited_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [candidate.invite_id]
        );

        sent += 1;
      } catch (_error) {
        failed += 1;
      }
    }

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'INTERVIEW_INVITES_SENT',
      targetType: 'job',
      targetId: Number(jobId),
      details: {
        sessionId: Number(session.id),
        sent,
        failed
      }
    });

    return res.status(200).json({ message: 'Interview invites processed', sent, failed });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/interviewRoutes.js -> router.post('/jobs/:jobId/draw-next', requireAuth, requireRole('panelist', 'admin'), drawNextCandidate)
export async function drawNextCandidate(req, res) {
  try {
    const { jobId } = req.params;
    const { organizationId, userId } = req.user;

    const [sessionRows] = await pool.query(
      `SELECT id, status
       FROM interview_sessions
       WHERE job_id = ? AND organization_id = ?
       LIMIT 1`,
      [jobId, organizationId]
    );

    if (!sessionRows.length) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    const session = sessionRows[0];

    // Draw uses persisted random_order so all panelists see the same queue.
    const [nextRows] = await pool.query(
      `SELECT ii.id AS invite_id, ii.candidate_id, ii.random_order,
              c.candidate_code, c.full_name, c.email
       FROM interview_invites ii
       JOIN candidates c ON c.id = ii.candidate_id
       WHERE ii.interview_session_id = ? AND ii.invite_status IN ('pending', 'sent')
       ORDER BY ii.random_order ASC
       LIMIT 1`,
      [session.id]
    );

    if (!nextRows.length) {
      await pool.query(
        `UPDATE interview_sessions
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status <> 'completed'`,
        [session.id]
      );

      return res.status(200).json({ message: 'All shortlisted candidates have already been drawn', done: true });
    }

    const selected = nextRows[0];

    await pool.query(
      `UPDATE interview_invites
       SET invite_status = 'drawn', drawn_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [selected.invite_id]
    );

    if (session.status === 'scheduled') {
      await pool.query(
        `UPDATE interview_sessions
         SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [session.id]
      );
    }

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'INTERVIEW_CANDIDATE_DRAWN',
      targetType: 'candidate',
      targetId: Number(selected.candidate_id),
      details: {
        jobId: Number(jobId),
        sessionId: Number(session.id),
        randomOrder: Number(selected.random_order)
      }
    });

    return res.status(200).json({
      done: false,
      candidate: {
        candidateId: Number(selected.candidate_id),
        candidateCode: selected.candidate_code,
        fullName: selected.full_name,
        email: selected.email,
        randomOrder: Number(selected.random_order)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
