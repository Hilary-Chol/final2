import { Router } from 'express';
import {
  registerApplicant,
  loginApplicant,
  getApplicantProfile,
  updateApplicantProfile,
  getApplicantResume,
  getApplicantCvFeedback
} from '../controllers/applicantAuthController.js';
import { requireApplicantAuth } from '../middleware/applicantAuthMiddleware.js';
import { handleApplicantResumeUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/register', registerApplicant);
router.post('/login', loginApplicant);
router.get('/profile', requireApplicantAuth, getApplicantProfile);
router.put('/profile', requireApplicantAuth, handleApplicantResumeUpload, updateApplicantProfile);
router.get('/resume', requireApplicantAuth, getApplicantResume);
router.get('/cv-feedback', requireApplicantAuth, getApplicantCvFeedback);

// Exported to: server/src/index.js -> app.use('/api/applicants', applicantRoutes)
export default router;
