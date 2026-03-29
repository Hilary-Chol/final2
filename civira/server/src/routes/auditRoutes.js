import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), getAuditLogs);

// Exported to: server/src/index.js -> app.use('/api/audit', auditRoutes)
export default router;
