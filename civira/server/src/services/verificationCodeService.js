import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

let tableEnsured = false;

async function ensureVerificationTable() {
  if (tableEnsured) {
    return;
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL,
      purpose VARCHAR(80) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      attempt_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_verification_lookup (email, purpose, consumed_at, expires_at)
    )`
  );

  tableEnsured = true;
}

function createSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueVerificationCode({ email, purpose, ttlMinutes = 10 }) {
  await ensureVerificationTable();

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const code = createSixDigitCode();
  const codeHash = await bcrypt.hash(code, 10);

  await pool.query(
    'UPDATE verification_codes SET consumed_at = NOW() WHERE email = ? AND purpose = ? AND consumed_at IS NULL',
    [normalizedEmail, purpose]
  );

  await pool.query(
    `INSERT INTO verification_codes (email, purpose, code_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [normalizedEmail, purpose, codeHash, ttlMinutes]
  );

  return { code, expiresInMinutes: ttlMinutes };
}

export async function verifyVerificationCode({ email, purpose, code }) {
  await ensureVerificationTable();

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const providedCode = String(code || '').trim();

  if (!providedCode) {
    return { ok: false, message: 'Verification code is required' };
  }

  const [rows] = await pool.query(
    `SELECT id, code_hash, expires_at
     FROM verification_codes
     WHERE email = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [normalizedEmail, purpose]
  );

  if (!rows.length) {
    return { ok: false, message: 'No active verification code found. Request a new code.' };
  }

  const record = rows[0];
  const now = Date.now();
  if (new Date(record.expires_at).getTime() < now) {
    await pool.query('UPDATE verification_codes SET consumed_at = NOW() WHERE id = ?', [record.id]);
    return { ok: false, message: 'Verification code expired. Request a new code.' };
  }

  const matches = await bcrypt.compare(providedCode, record.code_hash);
  if (!matches) {
    await pool.query('UPDATE verification_codes SET attempt_count = attempt_count + 1 WHERE id = ?', [record.id]);
    return { ok: false, message: 'Invalid verification code' };
  }

  await pool.query('UPDATE verification_codes SET consumed_at = NOW() WHERE id = ?', [record.id]);
  return { ok: true };
}
