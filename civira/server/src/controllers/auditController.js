import pool from '../config/db.js';

// Exported to: server/src/routes/auditRoutes.js -> router.get('/', requireAuth, requireRole('admin'), getAuditLogs)
export async function getAuditLogs(req, res) {
  try {
    const { organizationId } = req.user;

    // This API returns activity history for auditing and governance tracking.
    const [rows] = await pool.query(
      `SELECT id, action, target_type, target_id, details, created_at
       FROM audit_logs
       WHERE organization_id = ?
       ORDER BY created_at DESC
       LIMIT 300`,
      [organizationId]
    );

    const parsed = rows.map((item) => ({
      ...item,
      details: item.details ? JSON.parse(item.details) : {}
    }));

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
