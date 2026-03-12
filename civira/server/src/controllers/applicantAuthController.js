import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

function parseSkills(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return JSON.parse(value);
}

export async function registerApplicant(req, res) {
  try {
    const { fullName, email, password, phone, location, experienceLevel, skills } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    // Check if email already exists
    const [existingApplicant] = await pool.query(
      'SELECT id FROM applicants WHERE email = ?',
      [email]
    );

    if (existingApplicant.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO applicants (full_name, email, password_hash, phone, location, experience_level, skills)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        email,
        passwordHash,
        phone || null,
        location || null,
        experienceLevel || 'entry',
        skills ? JSON.stringify(skills) : null
      ]
    );

    const applicantId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { applicantId, email, fullName, role: 'applicant' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      applicantId,
      email,
      token
    });
  } catch (error) {
    console.error('Register applicant error:', error);
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
}

export async function loginApplicant(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [applicants] = await pool.query(
      'SELECT id, full_name, email, password_hash, phone, location, experience_level, skills, resume_file_name FROM applicants WHERE email = ?',
      [email]
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
