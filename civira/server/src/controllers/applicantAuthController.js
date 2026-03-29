import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { sendVerificationCodeEmail } from '../services/emailService.js';
import { parseResumeFile } from '../utils/resumeParser.js';
import { rateCvWithAi } from '../services/cvAiRatingService.js';
import { issueVerificationCode, verifyVerificationCode } from '../services/verificationCodeService.js';

function parseSkills(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return JSON.parse(value);
}

// Exported to: server/src/routes/applicantRoutes.js -> router.post('/register', registerApplicant)
export async function registerApplicant(req, res) {
  try {
    const { fullName, email, phone, location, password, verificationCode } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!fullName || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const [existingApplicant] = await pool.query(
      'SELECT id FROM applicants WHERE email = ?',
      [normalizedEmail]
    );

    if (existingApplicant.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    if (!verificationCode) {
      const { code } = await issueVerificationCode({
        email: normalizedEmail,
        purpose: 'applicant_registration'
      });

      let delivery = 'sent';
      try {
        const emailResult = await sendVerificationCodeEmail({
          to: normalizedEmail,
          fullName,
          code,
          audience: 'applicant'
        });
        if (emailResult?.skipped) {
          delivery = 'skipped';
        }
      } catch {
        delivery = 'failed';
      }

      return res.status(200).json({
        requiresVerification: true,
        message: delivery === 'sent'
          ? 'Verification code sent to your email.'
          : 'Email service unavailable. Use the verification code from this response.',
        verificationCode: delivery === 'sent' ? null : code,
        delivery
      });
    }

    const verification = await verifyVerificationCode({
      email: normalizedEmail,
      purpose: 'applicant_registration',
      code: verificationCode
    });

    if (!verification.ok) {
      return res.status(400).json({ message: verification.message });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO applicants (full_name, email, password_hash, phone, location, experience_level, skills)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        normalizedEmail,
        passwordHash,
        phone || null,
        location || null,
        'entry',
        null
      ]
    );

    const applicantId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { applicantId, email: normalizedEmail, fullName, role: 'applicant' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      applicantId,
      email: normalizedEmail,
      token
    });
  } catch (error) {
    console.error('Register applicant error:', error);
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
}

// Exported to: server/src/routes/applicantRoutes.js -> router.get('/resume', requireApplicantAuth, getApplicantResume)
export async function getApplicantResume(req, res) {
  try {
    const { applicantId } = req.user;

    const [rows] = await pool.query(
      'SELECT resume_file_name, resume_mime_type, resume_blob FROM applicants WHERE id = ?',
      [applicantId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    const applicant = rows[0];
    if (!applicant.resume_blob) {
      return res.status(404).json({ message: 'No resume uploaded yet' });
    }

    res.setHeader('Content-Type', applicant.resume_mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${applicant.resume_file_name || 'resume'}"`
    );

    return res.status(200).send(applicant.resume_blob);
  } catch (error) {
    console.error('Get applicant resume error:', error);
    return res.status(500).json({ message: 'Failed to fetch resume', error: error.message });
  }
}

// Exported to: server/src/routes/applicantRoutes.js -> router.get('/cv-feedback', requireApplicantAuth, getApplicantCvFeedback)
export async function getApplicantCvFeedback(req, res) {
  try {
    const { applicantId } = req.user;
    const jobId = Number(req.query.jobId || req.body?.jobId || 0);

    const [rows] = await pool.query(
      'SELECT resume_file_name, resume_mime_type, resume_blob FROM applicants WHERE id = ?',
      [applicantId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    const applicant = rows[0];
    if (!applicant.resume_blob) {
      return res.status(404).json({ message: 'Please upload your CV in profile first' });
    }

    let jobKeywords = [];
    if (jobId) {
      const [jobRows] = await pool.query('SELECT criteria_keywords FROM jobs WHERE id = ?', [jobId]);
      if (jobRows.length) {
        const rawKeywords = jobRows[0].criteria_keywords;
        if (Array.isArray(rawKeywords)) {
          jobKeywords = rawKeywords;
        } else if (typeof rawKeywords === 'string') {
          try {
            const parsed = JSON.parse(rawKeywords);
            jobKeywords = Array.isArray(parsed) ? parsed : [];
          } catch {
            jobKeywords = [];
          }
        }
      }
    }

    const parsedResume = await parseResumeFile(
      {
        originalname: applicant.resume_file_name,
        mimetype: applicant.resume_mime_type,
        buffer: applicant.resume_blob
      },
      jobKeywords
    );

    const feedback = await rateCvWithAi(parsedResume.resumeText || '', jobKeywords);

    return res.status(200).json({
      resumeFileName: applicant.resume_file_name,
      extractedKeywords: parsedResume.extractedKeywords || [],
      ...feedback
    });
  } catch (error) {
    console.error('CV feedback error:', error);
    return res.status(500).json({ message: 'Failed to generate CV feedback', error: error.message });
  }
}

// Exported to: server/src/routes/applicantRoutes.js -> router.post('/login', loginApplicant)
export async function loginApplicant(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [applicants] = await pool.query(
      'SELECT id, full_name, email, password_hash, phone, location, experience_level, skills, resume_file_name FROM applicants WHERE email = ?',
      [normalizedEmail]
    );

    if (applicants.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const applicant = applicants[0];

    const passwordMatch = await bcrypt.compare(password, applicant.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        applicantId: applicant.id,
        email: applicant.email,
        fullName: applicant.full_name,
        role: 'applicant'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      applicantId: applicant.id,
      email: applicant.email,
      fullName: applicant.full_name,
      phone: applicant.phone,
      location: applicant.location,
      experienceLevel: applicant.experience_level,
      skills: parseSkills(applicant.skills),
      resumeFileName: applicant.resume_file_name,
      token
    });
  } catch (error) {
    console.error('Login applicant error:', error);
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
}

// Exported to: server/src/routes/applicantRoutes.js -> router.get('/profile', requireApplicantAuth, getApplicantProfile)
export async function getApplicantProfile(req, res) {
  try {
    const { applicantId } = req.user;

    const [applicants] = await pool.query(
      'SELECT id, full_name, email, phone, location, experience_level, skills, resume_file_name, created_at FROM applicants WHERE id = ?',
      [applicantId]
    );

    if (applicants.length === 0) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    const applicant = applicants[0];

    return res.status(200).json({
      applicantId: applicant.id,
      fullName: applicant.full_name,
      email: applicant.email,
      phone: applicant.phone,
      location: applicant.location,
      experienceLevel: applicant.experience_level,
      skills: parseSkills(applicant.skills),
      resumeFileName: applicant.resume_file_name,
      createdAt: applicant.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
}

// Exported to: server/src/routes/applicantRoutes.js -> router.put('/profile', requireApplicantAuth, handleApplicantResumeUpload, updateApplicantProfile)
export async function updateApplicantProfile(req, res) {
  try {
    const { applicantId } = req.user;
    const { phone, location, experienceLevel } = req.body;
    const skillsInput = req.body.skills;
    let normalizedSkills = null;

    if (Array.isArray(skillsInput)) {
      normalizedSkills = skillsInput;
    } else if (typeof skillsInput === 'string' && skillsInput.trim()) {
      try {
        normalizedSkills = JSON.parse(skillsInput);
      } catch {
        normalizedSkills = skillsInput
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    await pool.query(
      `UPDATE applicants SET phone = ?, location = ?, experience_level = ?, skills = ?, resume_file_name = COALESCE(?, resume_file_name), resume_mime_type = COALESCE(?, resume_mime_type), resume_blob = COALESCE(?, resume_blob)
       WHERE id = ?`,
      [
        phone || null,
        location || null,
        experienceLevel || 'entry',
        normalizedSkills ? JSON.stringify(normalizedSkills) : null,
        req.file?.originalname || null,
        req.file?.mimetype || null,
        req.file?.buffer || null,
        applicantId
      ]
    );

    const [updatedRows] = await pool.query(
      'SELECT id, full_name, email, phone, location, experience_level, skills, resume_file_name FROM applicants WHERE id = ?',
      [applicantId]
    );

    const updatedApplicant = updatedRows[0];

    return res.status(200).json({
      message: 'Profile updated successfully',
      applicant: {
        applicantId: updatedApplicant.id,
        fullName: updatedApplicant.full_name,
        email: updatedApplicant.email,
        phone: updatedApplicant.phone,
        location: updatedApplicant.location,
        experienceLevel: updatedApplicant.experience_level,
        skills: parseSkills(updatedApplicant.skills),
        resumeFileName: updatedApplicant.resume_file_name
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
}
