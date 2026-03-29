import { Router } from 'express';
import { getFinalSelection, getTopCandidatesWithFeedback, submitPanelScore } from '../controllers/scoreController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, requireRole('panelist'), submitPanelScore);
router.get('/final-selection/:jobId', requireAuth, getFinalSelection);
router.get('/top-candidates/:jobId', requireAuth, requireRole('admin'), getTopCandidatesWithFeedback);

// Exported to: server/src/index.js -> app.use('/api/scores', scoreRoutes)
export default router;
