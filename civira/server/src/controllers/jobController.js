import pool from '../config/db.js';
import { saveAuditLog } from '../services/auditService.js';
import { getOrganizationNameColumn } from '../utils/organizationNameColumn.js';
import { parseKeywordArray } from '../utils/keywordParser.js';

function mapJobRow(job) {
  return {
    ...job,
    criteria_keywords: parseKeywordArray(job.criteria_keywords)
  };
}

export async function createJob(req, res) {
  try {
    const { title, description, criteriaKeywords } = req.body;
    const { organizationId, userId } = req.user;

    // This API opens a job and stores the organization-defined keyword criteria for ranking.
    if (!title || !Array.isArray(criteriaKeywords)) {
      return res.status(400).json({ message: 'Title and criteriaKeywords array are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO jobs (organization_id, title, description, criteria_keywords, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [organizationId, title, description || '', JSON.stringify(criteriaKeywords), userId]
    );

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'JOB_CREATED',
      targetType: 'job',
      targetId: result.insertId,
      details: { title, criteriaKeywords }
    });

    return res.status(201).json({ message: 'Job opened', jobId: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function listJobs(req, res) {
  try {
    const { organizationId } = req.user;

    // This API returns all jobs created by the authenticated organization account.
    const [rows] = await pool.query(
      `SELECT id, title, description, criteria_keywords, status, created_at
       FROM jobs
       WHERE organization_id = ?
       ORDER BY created_at DESC`,
      [organizationId]
    );

    const mapped = rows.map(mapJobRow);

    return res.status(200).json(mapped);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function listPublicJobs(_req, res) {
  try {
    const organizationNameColumn = await getOrganizationNameColumn();
    const [rows] = await pool.query(
      `SELECT j.id, j.title, j.description, j.criteria_keywords, j.status, j.created_at, o.${organizationNameColumn} AS organization_name
       FROM jobs j
       JOIN organizations o ON o.id = j.organization_id
       WHERE j.status = 'open'
       ORDER BY j.created_at DESC`
    );

    const mapped = rows.map(mapJobRow);

    return res.status(200).json(mapped);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
