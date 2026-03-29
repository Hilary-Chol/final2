import { rateCvWithAi } from '../services/cvAiRatingService.js';

// Exported to: server/src/routes/cvAiRoutes.js -> router.post('/rate-cv', rateCvController)
export async function rateCvController(req, res) {
  try {
    const payload = req.body || {};
    const cvText = payload.cvText ?? payload.cv_text ?? payload.resumeText ?? payload.resume_text ?? '';
    const jobKeywords = payload.jobKeywords ?? payload.job_keywords ?? payload.keywords ?? [];

    if (!String(cvText).trim()) {
      return res.status(400).json({ message: 'cvText is required' });
    }

    const result = await rateCvWithAi(cvText, jobKeywords);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to rate CV',
      error: error?.message || 'Unknown error'
    });
  }
}
