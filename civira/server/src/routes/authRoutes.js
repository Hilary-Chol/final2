import { Router } from 'express';
import { addPanelist, login, registerOrganization } from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register-organization', registerOrganization);
router.post('/login', login);
router.post('/panelists', requireAuth, requireRole('admin'), addPanelist);

export default router;
