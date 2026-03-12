import { Router } from 'express';
import { addCandidate, applyToJob, getShortlist, rankAndShortlist, trackApplication, getApplicantApplications } from '../controllers/candidateController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireApplicantAuth } from '../middleware/applicantAuthMiddleware.js';
import { handleApplicantResumeUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/apply', requireApplicantAuth, handleApplicantResumeUpload, applyToJob);
router.get('/my-applications', requireApplicantAuth, getApplicantApplications);
router.post('/track', trackApplication);
router.post('/', requireAuth, addCandidate);
router.post('/shortlist/:jobId', requireAuth, rankAndShortlist);
router.get('/shortlist/:jobId', requireAuth, getShortlist);

export default router;
