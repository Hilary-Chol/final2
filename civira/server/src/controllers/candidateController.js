import pool from '../config/db.js';
import { generateCode } from '../utils/codeGenerator.js';
import { getOrganizationNameColumn } from '../utils/organizationNameColumn.js';
import { parseKeywordArray } from '../utils/keywordParser.js';
import { parseResumeFile } from '../utils/resumeParser.js';
import { computeCandidateRanking, topTenCandidates } from '../utils/ranking.js';
import { saveAuditLog } from '../services/auditService.js';
import { sendShortlistEmailToAdmin } from '../services/emailService.js';
import { inferApplicantMetricsFromCv } from '../utils/cvProfileInference.js';

function normalizeKeywords(profileKeywords) {
  return parseKeywordArray(profileKeywords);
}

function mergeKeywords(...keywordGroups) {
  const seen = new Map();

  keywordGroups.flat().forEach((item) => {
    const normalized = String(item || '').trim();
    if (!normalized) {
      return;
    }

    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalized);
    }
  });

  return Array.from(seen.values());
}

function buildTrackingResult({
  candidate,
  shortlistGenerated,
  shortlistEntry,
  scoreSummary,
  leadingCandidate
}) {
  const shortlisted = Boolean(shortlistEntry);
  const scoreCount = Number(scoreSummary.score_count || 0);
  const isLeadingCandidate = Boolean(leadingCandidate) && Number(leadingCandidate.candidate_id) === Number(candidate.candidate_id);

  let statusKey = 'under_review';
  let statusLabel = 'Application under review';
  let summary = 'Your application has been received and is awaiting shortlist generation.';

  if (shortlistGenerated && !shortlisted) {
    statusKey = 'not_shortlisted';
    statusLabel = 'Not shortlisted';
    summary = 'A shortlist has been generated for this job and this application was not advanced.';
  } else if (shortlisted && scoreCount === 0) {
    statusKey = 'shortlisted';
    statusLabel = 'Shortlisted for panel review';
    summary = 'Your application reached the shortlist and is waiting for panel scores.';
  } else if (shortlisted && scoreCount > 0 && !isLeadingCandidate) {
    statusKey = 'panel_review_completed';
    statusLabel = 'Panel review completed';
    summary = 'Panel scores have been submitted for this application.';
  } else if (shortlisted && scoreCount > 0 && isLeadingCandidate) {
    statusKey = 'leading_candidate';
    statusLabel = 'Leading after panel review';
    summary = 'Current aggregate panel scores place this application at the top of the shortlist.';
  }

  const timeline = [
    {
      key: 'received',
      label: 'Application received',
      complete: true,
      current: statusKey === 'under_review',
      description: 'Your candidate code has been issued and the application is stored in the system.'
    },
    {
      key: 'screening',
      label: shortlistGenerated ? 'Shortlist screening completed' : 'Shortlist screening pending',
      complete: shortlistGenerated,
      current: !shortlistGenerated,
      description: shortlistGenerated
        ? shortlisted
          ? 'This application advanced to the shortlist.'
          : 'This application did not make the shortlist.'
        : 'The organization has not generated a shortlist yet.'
    },
    {
      key: 'panel',
      label: 'Panel review',
      complete: scoreCount > 0,
      current: shortlisted && scoreCount === 0,
      description: shortlisted
        ? scoreCount > 0
          ? `Panel review completed with ${scoreCount} submitted score(s).`
          : 'Shortlisted applications are waiting for independent panel scoring.'
        : 'Only shortlisted applications move to panel review.'
    },
    {
      key: 'outcome',
      label: 'Current outcome',
      complete: shortlistGenerated,
      current: shortlisted && scoreCount > 0,
      description: summary
    }
  ];

  return {
    statusKey,
    statusLabel,
    summary,
    timeline,
    shortlisted,
    shortlistGenerated,
    ranking: shortlistEntry
      ? {
          rankPosition: shortlistEntry.rank_position,
          rankingScore: Number(shortlistEntry.ranking_score)
        }
      : null,
    scoreSummary: scoreCount > 0
      ? {
          scoreCount,
          totalScore: Number(scoreSummary.total_score),
          averageScore: Number(scoreSummary.average_score)
        }
      : null,
    leadingCandidate: leadingCandidate
      ? {
          candidateCode: leadingCandidate.candidate_code,
          totalScore: Number(leadingCandidate.total_score)
        }
      : null
  };
}

async function createCandidateRecord({
  jobId,
  fullName,
  email,
  qualificationScore,
  experienceYears,
  profileKeywords,
  organizationId,
  actorUserId,
  action,
  details
}) {
  const candidateCode = generateCode('CND');
  const normalizedKeywords = normalizeKeywords(profileKeywords);

  const [result] = await pool.query(
    `INSERT INTO candidates (job_id, candidate_code, full_name, email, qualification_score, experience_years, profile_keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      candidateCode,
      fullName,
      email,
      Number(qualificationScore || 0),
      Number(experienceYears || 0),
      JSON.stringify(normalizedKeywords)
    ]
  );

  await saveAuditLog({
    organizationId,
    actorUserId,
    action,
    targetType: 'candidate',
    targetId: result.insertId,
    details: { jobId, candidateCode, ...details }
  });

  return { candidateId: result.insertId, candidateCode };
}

async function rebuildShortlistForJob(jobId) {
  const [jobRows] = await pool.query('SELECT id, criteria_keywords FROM jobs WHERE id = ?', [jobId]);
  if (!jobRows.length) {
    return [];
  }

  const criteriaKeywords = parseKeywordArray(jobRows[0].criteria_keywords);
  const [candidateRows] = await pool.query('SELECT * FROM candidates WHERE job_id = ?', [jobId]);

  const ranked = candidateRows.map((candidate) => ({
    ...candidate,
    rankingScore: computeCandidateRanking(candidate, criteriaKeywords)
  }));

  const shortlisted = topTenCandidates(ranked).map((candidate, index) => ({
    candidateId: candidate.id,
    rankPosition: index + 1,
    rankingScore: candidate.rankingScore,
    candidateCode: candidate.candidate_code,
    fullName: candidate.full_name,
    email: candidate.email
  }));

  await pool.query('DELETE FROM shortlists WHERE job_id = ?', [jobId]);

  for (const item of shortlisted) {
    await pool.query(
      'INSERT INTO shortlists (job_id, candidate_id, rank_position, ranking_score) VALUES (?, ?, ?, ?)',
      [jobId, item.candidateId, item.rankPosition, item.rankingScore]
    );
  }

  await pool.query(
    `UPDATE candidates
     SET application_status = 'not_shortlisted'
     WHERE job_id = ?`,
    [jobId]
  );

  if (shortlisted.length) {
    await pool.query(
      `UPDATE candidates
       SET application_status = 'shortlisted'
       WHERE job_id = ? AND id IN (?)`,
      [jobId, shortlisted.map((item) => Number(item.candidateId))]
    );
  }

  return shortlisted;
}

// Exported to: server/src/routes/candidateRoutes.js -> router.post('/', requireAuth, addCandidate)
export async function addCandidate(req, res) {
  try {
    const { jobId, fullName, email, qualificationScore, experienceYears, profileKeywords } = req.body;
    const { organizationId, userId } = req.user;

    if (!jobId || !fullName || !email || !Array.isArray(profileKeywords)) {
      return res.status(400).json({ message: 'Missing required candidate fields' });
    }

    const [jobRows] = await pool.query('SELECT id FROM jobs WHERE id = ? AND organization_id = ?', [jobId, organizationId]);
    if (!jobRows.length) {
      return res.status(404).json({ message: 'Job not found in your organization' });
    }

    const candidate = await createCandidateRecord({
      jobId,
      fullName,
      email,
      qualificationScore,
      experienceYears,
      profileKeywords,
      organizationId,
      actorUserId: userId,
      action: 'CANDIDATE_ADDED',
      details: { source: 'organization_portal' }
    });

    return res.status(201).json({ message: 'Candidate added', ...candidate });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/candidateRoutes.js -> router.post('/apply', requireApplicantAuth, handleApplicantResumeUpload, applyToJob)
export async function applyToJob(req, res) {
  try {
    const { applicantId } = req.user; // Requires applicant authentication
    const { jobId, profileKeywords } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Get applicant info
    const [applicantRows] = await pool.query(
      'SELECT id, full_name, email, experience_level, skills, resume_file_name, resume_mime_type, resume_blob FROM applicants WHERE id = ?',
      [applicantId]
    );

    if (!applicantRows.length) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    const applicant = applicantRows[0];

    const [jobRows] = await pool.query(
      'SELECT id, organization_id, status, criteria_keywords, application_deadline FROM jobs WHERE id = ?',
      [jobId]
    );

    if (!jobRows.length) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (jobRows[0].status !== 'open') {
      return res.status(400).json({ message: 'This job is no longer accepting applications' });
    }

    if (jobRows[0].application_deadline) {
      const deadline = new Date(jobRows[0].application_deadline);
      deadline.setHours(23, 59, 59, 999);
      if (Date.now() > deadline.getTime()) {
        return res.status(400).json({ message: 'Application deadline has passed for this job' });
      }
    }

    const [existingRows] = await pool.query(
      'SELECT id FROM candidates WHERE job_id = ? AND applicant_id = ?',
      [jobId, applicantId]
    );

    if (existingRows.length) {
      return res.status(409).json({ message: 'You have already applied to this job' });
    }

    const criteriaKeywords = parseKeywordArray(jobRows[0].criteria_keywords);
    const fallbackResumeFile = applicant.resume_blob
      ? {
          originalname: applicant.resume_file_name,
          mimetype: applicant.resume_mime_type,
          buffer: applicant.resume_blob
        }
      : null;
    const resumeSource = req.file || fallbackResumeFile;
    const resumeData = await parseResumeFile(resumeSource, criteriaKeywords);
    const mergedKeywords = mergeKeywords(
      normalizeKeywords(profileKeywords),
      normalizeKeywords(parseKeywordArray(applicant.skills)),
      resumeData.extractedKeywords
    );

    const inferred = inferApplicantMetricsFromCv({
      resumeText: resumeData.resumeText,
      criteriaKeywords,
      experienceLevel: applicant.experience_level
    });

    const candidateCode = generateCode('CND');
    const normalizedKeywords = normalizeKeywords(mergedKeywords);

    const [result] = await pool.query(
      `INSERT INTO candidates (job_id, applicant_id, candidate_code, full_name, email, qualification_score, experience_years, profile_keywords)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        applicantId,
        candidateCode,
        applicant.full_name,
        applicant.email,
        Number(inferred.inferredQualificationScore || 0),
        Number(inferred.inferredExperienceYears || 0),
        JSON.stringify(normalizedKeywords)
      ]
    );

    await saveAuditLog({
      organizationId: jobRows[0].organization_id,
      actorUserId: null,
      action: 'APPLICATION_SUBMITTED',
      targetType: 'candidate',
      targetId: result.insertId,
      details: {
        source: 'applicant_portal',
        applicantId,
        resumeFileName: resumeData.resumeFileName,
        extractedKeywordCount: resumeData.extractedKeywords.length,
        usedSavedResume: Boolean(!req.file && fallbackResumeFile)
      }
    });

    const refreshedShortlist = await rebuildShortlistForJob(jobId);
    const shortlistEntry = refreshedShortlist.find((entry) => entry.candidateId === result.insertId) || null;

    return res.status(201).json({
      message: 'Application submitted successfully',
      candidateId: result.insertId,
      candidateCode,
      parsedProfileKeywords: mergedKeywords,
      inferredQualificationScore: inferred.inferredQualificationScore,
      inferredExperienceYears: inferred.inferredExperienceYears,
      resumeProcessed: Boolean(resumeSource),
      usedSavedResume: Boolean(!req.file && fallbackResumeFile),
      shortlisted: Boolean(shortlistEntry),
      rankPosition: shortlistEntry ? shortlistEntry.rankPosition : null,
      rankingScore: shortlistEntry ? shortlistEntry.rankingScore : null
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/candidateRoutes.js -> router.post('/track', trackApplication)
export async function trackApplication(req, res) {
  try {
    const { candidateCode, email } = req.body;

    if (!candidateCode || !email) {
      return res.status(400).json({ message: 'Candidate code and email are required' });
    }

    const organizationNameColumn = await getOrganizationNameColumn();
    const [candidateRows] = await pool.query(
      `SELECT c.id AS candidate_id, c.candidate_code, c.full_name, c.email, c.created_at, c.job_id,
              j.title AS job_title, j.status AS job_status,
              o.${organizationNameColumn} AS organization_name
       FROM candidates c
       JOIN jobs j ON j.id = c.job_id
       JOIN organizations o ON o.id = j.organization_id
       WHERE c.candidate_code = ? AND LOWER(c.email) = LOWER(?)`,
      [candidateCode, email]
    );

    if (!candidateRows.length) {
      return res.status(404).json({ message: 'No application found with those details' });
    }

    const candidate = candidateRows[0];
    const [shortlistRows] = await pool.query(
      'SELECT rank_position, ranking_score FROM shortlists WHERE job_id = ? AND candidate_id = ?',
      [candidate.job_id, candidate.candidate_id]
    );
    const [shortlistCountRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM shortlists WHERE job_id = ?',
      [candidate.job_id]
    );
    const [scoreRows] = await pool.query(
      `SELECT COUNT(*) AS score_count, COALESCE(SUM(score), 0) AS total_score, COALESCE(AVG(score), 0) AS average_score
       FROM panel_scores
       WHERE job_id = ? AND candidate_id = ?`,
      [candidate.job_id, candidate.candidate_id]
    );
    const [leadingRows] = await pool.query(
      `SELECT c.id AS candidate_id, c.candidate_code, SUM(ps.score) AS total_score
       FROM panel_scores ps
       JOIN candidates c ON c.id = ps.candidate_id
       JOIN shortlists s ON s.candidate_id = c.id AND s.job_id = ps.job_id
       WHERE ps.job_id = ?
       GROUP BY c.id, c.candidate_code
       ORDER BY total_score DESC
       LIMIT 1`,
      [candidate.job_id]
    );

    const tracking = buildTrackingResult({
      candidate,
      shortlistGenerated: Number(shortlistCountRows[0].total) > 0,
      shortlistEntry: shortlistRows[0] || null,
      scoreSummary: scoreRows[0],
      leadingCandidate: leadingRows[0] || null
    });

    return res.status(200).json({
      candidate: {
        candidateCode: candidate.candidate_code,
        fullName: candidate.full_name,
        email: candidate.email,
        submittedAt: candidate.created_at
      },
      job: {
        id: candidate.job_id,
        title: candidate.job_title,
        status: candidate.job_status,
        organizationName: candidate.organization_name
      },
      ...tracking
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/candidateRoutes.js -> router.post('/shortlist/:jobId', requireAuth, rankAndShortlist)
export async function rankAndShortlist(req, res) {
  try {
    const { jobId } = req.params;
    const { organizationId, userId } = req.user;

    const [jobRows] = await pool.query('SELECT id, title, criteria_keywords FROM jobs WHERE id = ? AND organization_id = ?', [jobId, organizationId]);
    if (!jobRows.length) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const shortlisted = await rebuildShortlistForJob(jobId);

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'CANDIDATES_SHORTLISTED',
      targetType: 'job',
      targetId: Number(jobId),
      details: { shortlistedCount: shortlisted.length }
    });

    const [adminRows] = await pool.query(
      `SELECT email
       FROM users
       WHERE organization_id = ? AND role = 'admin'
       ORDER BY id ASC`,
      [organizationId]
    );

    let email = { skipped: true, message: 'No admin email found.' };
    if (adminRows.length) {
      email = await sendShortlistEmailToAdmin({
        to: adminRows.map((admin) => admin.email),
        jobTitle: jobRows[0].title,
        shortlisted
      });

      await saveAuditLog({
        organizationId,
        actorUserId: userId,
        action: 'SHORTLIST_EMAIL_SENT',
        targetType: 'job',
        targetId: Number(jobId),
        details: {
          recipients: adminRows.map((admin) => admin.email),
          shortlistedCount: shortlisted.length,
          emailSkipped: Boolean(email.skipped)
        }
      });
    }

    return res.status(200).json({ message: 'Top 10 shortlisted', shortlisted, email });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/candidateRoutes.js -> router.get('/shortlist/:jobId', requireAuth, getShortlist)
export async function getShortlist(req, res) {
  try {
    const { jobId } = req.params;

    const [rows] = await pool.query(
      `SELECT s.rank_position, s.ranking_score, c.id AS candidate_id, c.candidate_code, c.full_name, c.email,
              c.application_status, COUNT(ps.id) AS score_count
       FROM shortlists s
       JOIN candidates c ON c.id = s.candidate_id
       LEFT JOIN panel_scores ps ON ps.candidate_id = c.id AND ps.job_id = s.job_id
       WHERE s.job_id = ?
       GROUP BY s.rank_position, s.ranking_score, c.id, c.candidate_code, c.full_name, c.email, c.application_status
       ORDER BY s.rank_position ASC`,
      [jobId]
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/candidateRoutes.js -> router.get('/my-applications', requireApplicantAuth, getApplicantApplications)
export async function getApplicantApplications(req, res) {
  try {
    const { applicantId } = req.user;

    const [rows] = await pool.query(
      `SELECT c.id, c.candidate_code, c.job_id, j.title AS job_title, j.status AS job_status,
              c.created_at, c.profile_keywords,
              MAX(s.rank_position) AS rank_position, MAX(s.ranking_score) AS ranking_score,
              COUNT(DISTINCT ps.id) AS score_count,
              (SELECT COUNT(*) FROM candidates c2 WHERE c2.job_id = c.job_id) AS total_applicants
       FROM candidates c
       JOIN jobs j ON j.id = c.job_id
       LEFT JOIN shortlists s ON s.candidate_id = c.id
       LEFT JOIN panel_scores ps ON ps.candidate_id = c.id
       WHERE c.applicant_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [applicantId]
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/candidateRoutes.js -> router.delete('/my-applications/:candidateId', requireApplicantAuth, deleteApplicantApplication)
export async function deleteApplicantApplication(req, res) {
  const connection = await pool.getConnection();
  try {
    const { applicantId } = req.user;
    const candidateId = Number(req.params.candidateId);

    if (!candidateId) {
      return res.status(400).json({ message: 'Valid candidateId is required' });
    }

    const [candidateRows] = await connection.query(
      `SELECT c.id, c.job_id, j.organization_id
       FROM candidates c
       JOIN jobs j ON j.id = c.job_id
       WHERE c.id = ? AND c.applicant_id = ?
       LIMIT 1`,
      [candidateId, applicantId]
    );

    if (!candidateRows.length) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const candidate = candidateRows[0];

    const [scoreRows] = await connection.query(
      'SELECT COUNT(*) AS total FROM panel_scores WHERE candidate_id = ?',
      [candidateId]
    );

    if (Number(scoreRows[0].total || 0) > 0) {
      return res.status(400).json({ message: 'Cannot delete application after interview scoring has started' });
    }

    await connection.beginTransaction();
    await connection.query('DELETE FROM interview_invites WHERE candidate_id = ?', [candidateId]);
    await connection.query('DELETE FROM shortlists WHERE candidate_id = ?', [candidateId]);
    await connection.query('DELETE FROM candidates WHERE id = ? AND applicant_id = ?', [candidateId, applicantId]);
    await connection.commit();

    await rebuildShortlistForJob(candidate.job_id);

    await saveAuditLog({
      organizationId: candidate.organization_id,
      actorUserId: null,
      action: 'APPLICATION_WITHDRAWN',
      targetType: 'candidate',
      targetId: candidateId,
      details: { applicantId, jobId: candidate.job_id }
    });

    return res.status(200).json({ message: 'Application deleted successfully' });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // no-op rollback guard
    }
    return res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
}

// Get ranked list of all candidates for a specific job (for applicants to see ranking)
// Exported to: server/src/routes/candidateRoutes.js -> router.get('/ranking/:jobId', getJobRankingList)
export async function getJobRankingList(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    const [candidates] = await pool.query(
      `SELECT c.id, c.full_name, c.email, c.experience_years, c.qualification_score,
              COALESCE(s.rank_position, NULL) AS rank_position,
              COALESCE(s.ranking_score, 0) AS ranking_score,
              CASE 
                WHEN s.rank_position IS NOT NULL THEN 'shortlisted'
                ELSE 'not_shortlisted'
              END AS status
       FROM candidates c
       LEFT JOIN shortlists s ON s.candidate_id = c.id AND s.job_id = ?
       WHERE c.job_id = ?
       ORDER BY COALESCE(s.ranking_score, 0) DESC, c.experience_years DESC`,
      [jobId, jobId]
    );

    const result = candidates.map(candidate => ({
      ...candidate,
      rank_position: candidate.rank_position ? Number(candidate.rank_position) : null,
      ranking_score: Number(candidate.ranking_score).toFixed(2),
      experience_years: Number(candidate.experience_years).toFixed(1),
      qualification_score: Number(candidate.qualification_score).toFixed(1)
    }));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
