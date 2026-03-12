import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { generateCode } from '../utils/codeGenerator.js';
import { getOrganizationNameColumn } from '../utils/organizationNameColumn.js';
import { saveAuditLog } from '../services/auditService.js';
import { sendCredentialsEmail } from '../services/emailService.js';

export async function registerOrganization(req, res) {
  try {
    const { organizationName, adminName, adminEmail, adminPassword } = req.body;

    // This API creates a new organization account and the first admin user.
    if (!organizationName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Missing required registration fields' });
    }

    const accountCode = generateCode('ORG');
    const adminCode = generateCode('ADM');
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const organizationNameColumn = await getOrganizationNameColumn();

    const [orgResult] = await pool.query(
      `INSERT INTO organizations (${organizationNameColumn}, account_code) VALUES (?, ?)`,
      [organizationName, accountCode]
    );
    const organizationId = orgResult.insertId;

    const [userResult] = await pool.query(
      `INSERT INTO users (organization_id, user_code, full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'admin')`,
      [organizationId, adminCode, adminName, adminEmail, passwordHash]
    );

    await saveAuditLog({
      organizationId,
      actorUserId: userResult.insertId,
      action: 'ORGANIZATION_REGISTERED',
      targetType: 'organization',
      targetId: organizationId,
      details: { organizationName, adminEmail }
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

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const organizationNameColumn = await getOrganizationNameColumn();

    // This API verifies credentials and returns a JWT for authenticated sessions.
    const [rows] = await pool.query(
      `SELECT u.id, u.organization_id, u.user_code, u.full_name, u.email, u.password_hash, u.role, o.${organizationNameColumn} AS organization_name
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = ?`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

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
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        userCode: user.user_code,
        organizationName: user.organization_name
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function addPanelist(req, res) {
  try {
    const { fullName, email, password } = req.body;
    const { organizationId, userId, role } = req.user;

    // This API adds a panelist account under the same organization (maximum of 5 users total).
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can add panelists' });
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
      [organizationId, panelistCode, fullName, email, passwordHash]
    );

    await sendCredentialsEmail({
      to: email,
      subject: 'Your Civira account has been created',
      html: `<h3>Welcome to Civira</h3><p>Your panelist account has been created successfully.</p><p>User ID: ${panelistCode}</p><p>Email: ${email}</p><p>Please use the password shared with you by your administrator.</p>`
    });

    await saveAuditLog({
      organizationId,
      actorUserId: userId,
      action: 'PANELIST_CREATED',
      targetType: 'user',
      targetId: result.insertId,
      details: { panelistCode, email }
    });

    return res.status(201).json({ message: 'Panelist added', panelistCode, userId: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
