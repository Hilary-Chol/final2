import pool from '../config/db.js';

// Exported to: server/src/controllers/authController.js, candidateController.js, interviewController.js, jobController.js, scoreController.js and services/deadlineSchedulerService.js
export async function saveAuditLog({ organizationId, actorUserId, action, targetType, targetId, details }) {
  await pool.query(
    `INSERT INTO audit_logs (organization_id, actor_user_id, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [organizationId || null, actorUserId || null, action, targetType || null, targetId || null, JSON.stringify(details || {})]
  );
}
