import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import applicantRoutes from './routes/applicantRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import scoreRoutes from './routes/scoreRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import cvAiRoutes from './routes/cvAiRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import { startDeadlineScheduler } from './services/deadlineSchedulerService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 500);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'civira-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/ai', cvAiRoutes);

app.listen(port, () => {
  console.log(`Civira API running on port ${port}`);
  startDeadlineScheduler();
});
