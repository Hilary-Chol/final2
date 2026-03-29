import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { generateCode } from '../utils/codeGenerator.js';
import { getOrganizationNameColumn } from '../utils/organizationNameColumn.js';
import { saveAuditLog } from '../services/auditService.js';
import { sendCredentialsEmail, sendVerificationCodeEmail } from '../services/emailService.js';
import { issueVerificationCode, verifyVerificationCode } from '../services/verificationCodeService.js';

function parseSkills(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

// Exported to: server/src/routes/authRoutes.js -> router.post('/register-organization', registerOrganization)
export async function registerOrganization(req, res) {
  try {
    const {
      organizationName,
      adminName,
      adminEmail,
      adminPassword,
      managerName,
      managerEmail,
      managerPassword,
      verificationCode
    } = req.body;
    const supervisorPhone = req.body.supervisorPhone || '';
    const organizationEmail = req.body.organizationEmail || managerEmail || adminEmail || '';

    const ownerName = managerName || adminName;
    const ownerEmail = (managerEmail || adminEmail || '').trim().toLowerCase();
    const ownerPassword = managerPassword || adminPassword;

    // This API creates a new organization account and the first admin user.
    if (!organizationName || !ownerName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({ message: 'Missing required registration fields' });
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [ownerEmail]);
    if (existingUser.length) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    if (!verificationCode) {
      const { code } = await issueVerificationCode({
        email: ownerEmail,
        purpose: 'organization_registration'
      });

      let delivery = 'sent';
      try {
        const emailResult = await sendVerificationCodeEmail({
          to: ownerEmail,
          fullName: ownerName,
          code,
          audience: 'organization admin'
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
      email: ownerEmail,
      purpose: 'organization_registration',
      code: verificationCode
    });

    if (!verification.ok) {
      return res.status(400).json({ message: verification.message });
    }

    const accountCode = generateCode('ORG');
    const adminCode = generateCode('ADM');
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const organizationNameColumn = await getOrganizationNameColumn();

    const [orgResult] = await pool.query(
      `INSERT INTO organizations (${organizationNameColumn}, account_code, email, supervisor_name, supervisor_email, supervisor_phone) VALUES (?, ?, ?, ?, ?, ?)`,
      [organizationName, accountCode, organizationEmail, ownerName, ownerEmail, supervisorPhone]
    );
    const organizationId = orgResult.insertId;

    const [userResult] = await pool.query(
      `INSERT INTO users (organization_id, user_code, full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'admin')`,
      [organizationId, adminCode, ownerName, ownerEmail, passwordHash]
    );

    await saveAuditLog({
      organizationId,
      actorUserId: userResult.insertId,
      action: 'ORGANIZATION_REGISTERED',
      targetType: 'organization',
      targetId: organizationId,
      details: { organizationName, ownerEmail }
    });

    return res.status(201).json({
      message: 'Organization created successfully',
      organizationId,
      accountCode,
      adminCode
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/authRoutes.js -> router.post('/login', login)
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const organizationNameColumn = await getOrganizationNameColumn();

    // Unified login flow:
    // 1) Try organization users first (admin/panelist).
    // 2) If not found, try applicant accounts.
    // This lets one login form infer account type from the email.
    const [rows] = await pool.query(
      `SELECT u.id, u.organization_id, u.user_code, u.full_name, u.email, u.password_hash, u.role, o.${organizationNameColumn} AS organization_name
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = ?`,
      [normalizedEmail]
    );

    if (rows.length) {
      const user = rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organization_id,
          role: user.role,
          email: user.email,
          userCode: user.user_code
        },
        process.env.JWT_SECRET,
        { expiresIn: '10h' }
      );

      await saveAuditLog({
        organizationId: user.organization_id,
        actorUserId: user.id,
        action: 'USER_LOGIN',
        targetType: 'user',
        targetId: user.id,
        details: { email: user.email }
      });

      return res.status(200).json({
        accountType: 'organization',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          userCode: user.user_code,
          organizationId: user.organization_id,
          organizationName: user.organization_name
        }
      });
    }

    const [applicantRows] = await pool.query(
      `SELECT id, full_name, email, password_hash, phone, location, experience_level, skills, resume_file_name
       FROM applicants
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (!applicantRows.length) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const applicant = applicantRows[0];
    const isApplicantPasswordValid = await bcrypt.compare(password, applicant.password_hash);
    if (!isApplicantPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const applicantToken = jwt.sign(
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
      accountType: 'applicant',
      token: applicantToken,
      applicant: {
        applicantId: applicant.id,
        fullName: applicant.full_name,
        email: applicant.email,
        phone: applicant.phone,
        location: applicant.location,
        experienceLevel: applicant.experience_level,
        skills: parseSkills(applicant.skills),
        resumeFileName: applicant.resume_file_name
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

  // Exported to: server/src/routes/authRoutes.js -> router.post('/panelists/register', registerPanelist)
  export async function registerPanelist(req, res) {
    try {
      const { fullName, email, password, accountCode, verificationCode } = req.body;
      const normalizedEmail = String(email || '').trim().toLowerCase();

      // This API allows paneists to self-register by entering the organization account code
      if (!fullName || !normalizedEmail || !password || !accountCode) {
        return res.status(400).json({ message: 'Missing required registration fields' });
      }

      // Find organization by account code
      const [orgRows] = await pool.query(
        'SELECT id, organization_name FROM organizations WHERE account_code = ?',
        [accountCode.trim()]
      );

      if (!orgRows.length) {
        return res.status(400).json({ message: 'Invalid account code. Organization not found.' });
      }

      const organizationId = orgRows[0].id;

      // Check if panelist limit (5 users per org) is reached
      const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE organization_id = ?', [organizationId]);

      if (countRows[0].total >= 5) {
        return res.status(400).json({ message: 'This organization has reached the maximum number of team members (5)' });
      }

      // Check if email already exists
      const [existingEmail] = await pool.query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );

      if (existingEmail.length) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      if (!verificationCode) {
        const { code } = await issueVerificationCode({
          email: normalizedEmail,
          purpose: 'panelist_registration'
        });

        let delivery = 'sent';
        try {
          const emailResult = await sendVerificationCodeEmail({
            to: normalizedEmail,
            fullName,
            code,
            audience: 'panelist'
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
        purpose: 'panelist_registration',
        code: verificationCode
      });

      if (!verification.ok) {
        return res.status(400).json({ message: verification.message });
      }

      const panelistCode = generateCode('PNL');
      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        `INSERT INTO users (organization_id, user_code, full_name, email, password_hash, role)
         VALUES (?, ?, ?, ?, ?, 'panelist')`,
        [organizationId, panelistCode, fullName, normalizedEmail, passwordHash]
      );

      let passwordDelivery = 'sent';
      try {
        const emailResult = await sendCredentialsEmail({
          to: normalizedEmail,
          subject: 'Welcome to Civira',
          html: `<h3>Welcome to Civira</h3><p>Your panelist account has been created successfully.</p><p>Panelist Code: ${panelistCode}</p><p>Email: ${normalizedEmail}</p><p>You can now login and start scoring interviews.</p>`
        });
        if (emailResult?.skipped) {
          passwordDelivery = 'skipped';
        }
      } catch {
        passwordDelivery = 'failed';
      }

      await saveAuditLog({
        organizationId,
        actorUserId: result.insertId,
        action: 'PANELIST_REGISTERED',
        targetType: 'user',
        targetId: result.insertId,
        details: { panelistCode, email: normalizedEmail }
      });

      return res.status(201).json({
        message: 'Panelist account created successfully. Check your email for details.',
        panelistCode,
        userId: result.insertId,
        passwordDelivery
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
// Exported to: server/src/routes/authRoutes.js -> router.post('/panelists', requireAuth, requireRole('admin'), addPanelist)
// Exported to: server/src/routes/authRoutes.js -> router.post('/team-members', requireAuth, requireRole('admin'), addPanelist)
export async function addPanelist(req, res) {
  try {
    const { fullName, email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { organizationId, userId, role } = req.user;

    // This API adds a team member account under the same organization (maximum of 5 users total).
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only manager can add team members' });
    }

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE organization_id = ?', [organizationId]);

    if (countRows[0].total >= 5) {
      return res.status(400).json({ message: 'Organization already has 5 users' });
    }

    const panelistCode = generateCode('PNL');
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (organization_id, user_code, full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'panelist')`,
      [organizationId, panelistCode, fullName, normalizedEmail, passwordHash]
    );

    await sendCredentialsEmail({
      to: normalizedEmail,
      subject: 'Your Civira account has been created',
      html: `<h3>Welcome to Civira</h3><p>Your team member account has been created successfully.</p><p>User ID: ${panelistCode}</p><p>Email: ${email}</p><p>Please use the password shared with you by your manager.</p>`
    });

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'TEAM_MEMBER_CREATED',
      targetType: 'user',
      targetId: result.insertId,
      details: { panelistCode, email: normalizedEmail }
    });

    return res.status(201).json({ message: 'Team member added', panelistCode, userId: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/authRoutes.js -> router.get('/team-member-candidates', requireAuth, requireRole('admin'), listTeamMemberCandidates)
export async function listTeamMemberCandidates(req, res) {
  try {
    const query = String(req.query.query || '').trim().toLowerCase();
    const organizationNameColumn = await getOrganizationNameColumn();

    const [rows] = await pool.query(
      `SELECT u.id, u.user_code, u.full_name, u.email, u.role, u.created_at,
              o.id AS organization_id,
              o.${organizationNameColumn} AS organization_name
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.role = 'panelist'
         AND (
           ? = ''
           OR LOWER(u.full_name) LIKE CONCAT('%', ?, '%')
           OR LOWER(u.email) LIKE CONCAT('%', ?, '%')
           OR LOWER(u.user_code) LIKE CONCAT('%', ?, '%')
           OR LOWER(o.${organizationNameColumn}) LIKE CONCAT('%', ?, '%')
         )
       ORDER BY u.created_at DESC
       LIMIT 50`,
      [query, query, query, query, query]
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

function buildTemporaryPassword() {
  const seed = generateCode('TMP').replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return `${seed}@1a`;
}

// Exported to: server/src/routes/authRoutes.js -> router.post('/team-members/from-profile', requireAuth, requireRole('admin'), addTeamMemberFromApplicant)
export async function addTeamMemberFromApplicant(req, res) {
  try {
    const { applicantId } = req.body;
    const { organizationId, userId, role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only manager can add team members' });
    }

    if (!applicantId) {
      return res.status(400).json({ message: 'applicantId is required' });
    }

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE organization_id = ?', [organizationId]);
    if (countRows[0].total >= 5) {
      return res.status(400).json({ message: 'Organization already has 5 users' });
    }

    const [applicantRows] = await pool.query(
      'SELECT id, full_name, email FROM applicants WHERE id = ? LIMIT 1',
      [applicantId]
    );

    if (!applicantRows.length) {
      return res.status(404).json({ message: 'Applicant profile not found' });
    }

    const applicant = applicantRows[0];
    const normalizedEmail = String(applicant.email || '').trim().toLowerCase();

    const [existingUserRows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existingUserRows.length) {
      return res.status(409).json({ message: 'This profile email is already used by another organization account' });
    }

    const panelistCode = generateCode('PNL');
    const temporaryPassword = buildTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const [result] = await pool.query(
      `INSERT INTO users (organization_id, user_code, full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'panelist')`,
      [organizationId, panelistCode, applicant.full_name, normalizedEmail, passwordHash]
    );

    await sendCredentialsEmail({
      to: normalizedEmail,
      subject: 'Your Civira account has been created',
      html: `<h3>Welcome to Civira</h3><p>Your team member account has been created successfully.</p><p>User ID: ${panelistCode}</p><p>Email: ${normalizedEmail}</p><p>Temporary Password: ${temporaryPassword}</p><p>Please change your password after first login.</p>`
    });

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'TEAM_MEMBER_CREATED_FROM_PROFILE',
      targetType: 'user',
      targetId: result.insertId,
      details: { panelistCode, email: normalizedEmail, applicantId: applicant.id }
    });

    return res.status(201).json({
      message: 'Team member added from profile',
      userId: result.insertId,
      panelistCode,
      temporaryPassword
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/authRoutes.js -> router.get('/team-members', requireAuth, requireRole('admin'), listTeamMembers)
export async function listTeamMembers(req, res) {
  try {
    const { organizationId } = req.user;

    const [rows] = await pool.query(
      `SELECT id, user_code, full_name, email, role, created_at
       FROM users
       WHERE organization_id = ? AND role = 'panelist'
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/authRoutes.js -> router.delete('/team-members/:userId', requireAuth, requireRole('admin'), removeTeamMember)
export async function removeTeamMember(req, res) {
  try {
    const { organizationId, userId: actorUserId } = req.user;
    const memberId = Number(req.params.userId);

    if (!memberId) {
      return res.status(400).json({ message: 'Valid team member id is required' });
    }

    const [userRows] = await pool.query(
      `SELECT id, role, full_name, email
       FROM users
       WHERE id = ? AND organization_id = ?
       LIMIT 1`,
      [memberId, organizationId]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    const targetUser = userRows[0];
    if (targetUser.role !== 'panelist') {
      return res.status(400).json({ message: 'Only team members can be removed' });
    }

    const connection = await pool.getConnection();
    let removedScoreCount = 0;
    try {
      await connection.beginTransaction();

      const [scoreRows] = await connection.query(
        'SELECT COUNT(*) AS total FROM panel_scores WHERE panelist_id = ?',
        [memberId]
      );
      removedScoreCount = Number(scoreRows[0].total || 0);

      await connection.query('DELETE FROM panel_scores WHERE panelist_id = ?', [memberId]);
      await connection.query('UPDATE audit_logs SET actor_user_id = NULL WHERE actor_user_id = ?', [memberId]);
      await connection.query(
        'UPDATE jobs SET created_by = ? WHERE created_by = ? AND organization_id = ?',
        [actorUserId, memberId, organizationId]
      );
      await connection.query('DELETE FROM users WHERE id = ?', [memberId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await saveAuditLog({
      organizationId,
      actorUserId,
      action: 'TEAM_MEMBER_REMOVED',
      targetType: 'user',
      targetId: memberId,
      details: { fullName: targetUser.full_name, email: targetUser.email, removedScoreCount }
    });

    return res.status(200).json({ message: 'Team member removed successfully', removedScoreCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/authRoutes.js -> router.get('/me', requireAuth, getMyProfile)
export async function getMyProfile(req, res) {
  try {
    const { userId, organizationId } = req.user;

    const [rows] = await pool.query(
      `SELECT id, user_code, full_name, email, role, profile_bio, experience_text, skills, cv_file_name, created_at
       FROM users
       WHERE id = ? AND organization_id = ?
       LIMIT 1`,
      [userId, organizationId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const user = rows[0];
    return res.status(200).json({
      id: user.id,
      userCode: user.user_code,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      bio: user.profile_bio || '',
      experience: user.experience_text || '',
      skills: parseSkills(user.skills),
      cvFileName: user.cv_file_name || null,
      createdAt: user.created_at
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Exported to: server/src/routes/authRoutes.js -> router.put('/me', requireAuth, handleUserCvUpload, updateMyProfile)
export async function updateMyProfile(req, res) {
  try {
    const { userId, organizationId } = req.user;
    const { fullName, bio, experience, skills } = req.body;

    const normalizedSkills = parseSkills(skills);

    await pool.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           profile_bio = ?,
           experience_text = ?,
           skills = ?,
           cv_file_name = COALESCE(?, cv_file_name),
           cv_mime_type = COALESCE(?, cv_mime_type),
           cv_blob = COALESCE(?, cv_blob)
       WHERE id = ? AND organization_id = ?`,
      [
        fullName || null,
        bio || '',
        experience || '',
        JSON.stringify(normalizedSkills),
        req.file?.originalname || null,
        req.file?.mimetype || null,
        req.file?.buffer || null,
        userId,
        organizationId
      ]
    );

    const [rows] = await pool.query(
      `SELECT id, user_code, full_name, email, role, profile_bio, experience_text, skills, cv_file_name, created_at
       FROM users
       WHERE id = ? AND organization_id = ?
       LIMIT 1`,
      [userId, organizationId]
    );

    const user = rows[0];

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'USER_PROFILE_UPDATED',
      targetType: 'user',
      targetId: userId,
      details: { hasCvUpload: Boolean(req.file) }
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: {
        id: user.id,
        userCode: user.user_code,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        bio: user.profile_bio || '',
        experience: user.experience_text || '',
        skills: parseSkills(user.skills),
        cvFileName: user.cv_file_name || null,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
