import { Router } from 'express';
import {
  addCandidate,
  applyToJob,
  deleteApplicantApplication,
  getShortlist,
  rankAndShortlist,
  trackApplication,
  getApplicantApplications,
  getJobRankingList
} from '../controllers/candidateController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireApplicantAuth } from '../middleware/applicantAuthMiddleware.js';
import { handleApplicantResumeUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/apply', requireApplicantAuth, handleApplicantResumeUpload, applyToJob);
router.get('/my-applications', requireApplicantAuth, getApplicantApplications);
router.delete('/my-applications/:candidateId', requireApplicantAuth, deleteApplicantApplication);
router.get('/ranking/:jobId', getJobRankingList);
router.post('/track', trackApplication);
router.post('/', requireAuth, addCandidate);
router.post('/shortlist/:jobId', requireAuth, rankAndShortlist);
router.get('/shortlist/:jobId', requireAuth, getShortlist);

// Exported to: server/src/index.js -> app.use('/api/candidates', candidateRoutes)
export default router;
