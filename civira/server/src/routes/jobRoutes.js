import { Router } from 'express';
import { createJob, listJobs, listPublicJobs } from '../controllers/jobController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/public', listPublicJobs);
router.post('/', requireAuth, createJob);
router.get('/', requireAuth, listJobs);

export default router;
