import pool from '../config/db.js';

let cachedOrganizationNameColumn = null;

export async function getOrganizationNameColumn() {
  if (cachedOrganizationNameColumn) {
    return cachedOrganizationNameColumn;
  }

  const [rows] = await pool.query("SHOW COLUMNS FROM organizations LIKE 'organization_name'");
  cachedOrganizationNameColumn = rows.length ? 'organization_name' : 'name';
  return cachedOrganizationNameColumn;
}