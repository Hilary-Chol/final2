import express from 'express';
import { rateCvController } from '../controllers/cvAiController.js';

const router = express.Router();

router.post('/rate-cv', rateCvController);

// Exported to: server/src/index.js -> app.use('/api/ai', cvAiRoutes)
export default router;
