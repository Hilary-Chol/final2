import { Router } from 'express';
import {
	addPanelist,
	addTeamMemberFromApplicant,
	getMyProfile,
	listTeamMemberCandidates,
	listTeamMembers,
	login,
	registerOrganization,
	removeTeamMember,
	updateMyProfile,
	registerPanelist
} from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { handleUserCvUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/register-organization', registerOrganization);
router.post('/login', login);
router.get('/me', requireAuth, getMyProfile);
router.put('/me', requireAuth, handleUserCvUpload, updateMyProfile);
router.post('/panelists', requireAuth, requireRole('admin'), addPanelist);
router.post('/team-members', requireAuth, requireRole('admin'), addPanelist);
router.post('/team-members/from-profile', requireAuth, requireRole('admin'), addTeamMemberFromApplicant);
router.get('/team-members', requireAuth, requireRole('admin'), listTeamMembers);
router.get('/team-member-candidates', requireAuth, requireRole('admin'), listTeamMemberCandidates);
router.delete('/team-members/:userId', requireAuth, requireRole('admin'), removeTeamMember);
router.post('/panelists/register', registerPanelist);

// Exported to: server/src/index.js -> app.use('/api/auth', authRoutes)
export default router;
