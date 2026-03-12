import { Router } from 'express';
import {
  registerApplicant,
  loginApplicant,
  getApplicantProfile,
  updateApplicantProfile
} from '../controllers/applicantAuthController.js';
import { requireApplicantAuth } from '../middleware/applicantAuthMiddleware.js';
import { handleApplicantResumeUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/register', registerApplicant);
router.post('/login', loginApplicant);
router.get('/profile', requireApplicantAuth, getApplicantProfile);
router.put('/profile', requireApplicantAuth, handleApplicantResumeUpload, updateApplicantProfile);

export default router;
