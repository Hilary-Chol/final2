import { Router } from 'express';
import { getFinalSelection, submitPanelScore } from '../controllers/scoreController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, submitPanelScore);
router.get('/final-selection/:jobId', requireAuth, getFinalSelection);

export default router;
