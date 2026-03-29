import { Router } from 'express';
import {
  createInterviewSession,
  drawNextCandidate,
  getInterviewSession,
  sendInterviewInvites
} from '../controllers/interviewController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/jobs/:jobId/session', requireAuth, requireRole('admin'), createInterviewSession);
router.get('/jobs/:jobId/session', requireAuth, getInterviewSession);
router.post('/jobs/:jobId/send-invites', requireAuth, requireRole('admin'), sendInterviewInvites);
router.post('/jobs/:jobId/draw-next', requireAuth, requireRole('panelist', 'admin'), drawNextCandidate);

// Exported to: server/src/index.js -> app.use('/api/interviews', interviewRoutes)
export default router;
