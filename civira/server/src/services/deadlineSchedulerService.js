import pool from '../config/db.js';
import { parseKeywordArray } from '../utils/keywordParser.js';
import { computeCandidateRanking, topTenCandidates } from '../utils/ranking.js';
import { saveAuditLog } from './auditService.js';

function parseIntervalMs() {
  // Keep a safe minimum interval to avoid aggressive DB polling.
  const value = Number(process.env.DEADLINE_CHECK_INTERVAL_MS || 60000);
  if (Number.isNaN(value) || value < 10000) {
    return 60000;
  }

  return value;
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
    candidateId: Number(candidate.id),
    rankPosition: index + 1,
    rankingScore: candidate.rankingScore
  }));

  await pool.query('DELETE FROM shortlists WHERE job_id = ?', [jobId]);

  for (const item of shortlisted) {
    await pool.query(
      'INSERT INTO shortlists (job_id, candidate_id, rank_position, ranking_score) VALUES (?, ?, ?, ?)',
      [jobId, item.candidateId, item.rankPosition, item.rankingScore]
    );
  }

  return shortlisted;
}

async function setCandidateStatuses(jobId, shortlisted) {
  // Reset then re-apply shortlisted status to keep job state deterministic.
  await pool.query(
    `UPDATE candidates
     SET application_status = 'not_shortlisted'
     WHERE job_id = ?`,
    [jobId]
  );

  if (!shortlisted.length) {
    return;
  }

  const shortlistedCandidateIds = shortlisted.map((candidate) => Number(candidate.candidateId));
  await pool.query(
    `UPDATE candidates
     SET application_status = 'shortlisted'
     WHERE job_id = ? AND id IN (?)`,
    [jobId, shortlistedCandidateIds]
  );
}

// Exported to: internal deadline scheduler workflow; currently called by processExpiredJobs() inside this module.
export async function finalizeExpiredJob(jobRow) {
  // This is the core deadline automation: freeze top 10, set statuses, and close the job.
  const jobId = Number(jobRow.id);
  const organizationId = Number(jobRow.organization_id);

  const shortlisted = await rebuildShortlistForJob(jobId);
  await setCandidateStatuses(jobId, shortlisted);

  await pool.query(
    `UPDATE jobs
     SET status = 'closed'
     WHERE id = ?`,
    [jobId]
  );

  await saveAuditLog({
    organizationId,
    actorUserId: null,
    action: 'JOB_AUTO_FINALIZED_AFTER_DEADLINE',
    targetType: 'job',
    targetId: jobId,
    details: {
      shortlistedCount: shortlisted.length,
      trigger: 'deadline_scheduler'
    }
  });

  return shortlisted;
}

// Exported to: internal scheduler loop in startDeadlineScheduler() inside this module.
export async function processExpiredJobs() {
  const [rows] = await pool.query(
    `SELECT id, organization_id
     FROM jobs
     WHERE status = 'open' AND application_deadline IS NOT NULL AND application_deadline < CURDATE()`
  );

  let processed = 0;
  for (const row of rows) {
    await finalizeExpiredJob(row);
    processed += 1;
  }

  return { processed };
}

let schedulerTimer = null;
let isSchedulerRunning = false;

// Exported to: server/src/index.js -> startDeadlineScheduler() on API startup.
export function startDeadlineScheduler() {
  if (String(process.env.DISABLE_DEADLINE_SCHEDULER || '').toLowerCase() === 'true') {
    console.log('Deadline scheduler disabled by DISABLE_DEADLINE_SCHEDULER=true');
    return;
  }

  if (schedulerTimer) {
    return;
  }

  const intervalMs = parseIntervalMs();

  schedulerTimer = setInterval(async () => {
    // Guard against overlapping runs if a previous cycle is still processing.
    if (isSchedulerRunning) {
      return;
    }

    isSchedulerRunning = true;
    try {
      const { processed } = await processExpiredJobs();
      if (processed > 0) {
        console.log(`Deadline scheduler finalized ${processed} job(s).`);
      }
    } catch (error) {
      console.error('Deadline scheduler failed:', error.message);
    } finally {
      isSchedulerRunning = false;
    }
  }, intervalMs);

  console.log(`Deadline scheduler started (interval: ${intervalMs}ms)`);
}
