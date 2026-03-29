#!/usr/bin/env node

/**
 * Database Migration Script
 * Adds missing columns to organizations and applicants tables
 */

const mysql = require('mysql2/promise');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'machikam',
    database: 'civira_db'
  });

  try {
    console.log('🔄 Running database migrations...\n');

    // Add email to organizations if it doesn't exist
    const [columns1] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'email'"
    );
    
    if (!columns1.length) {
      console.log('Adding email column to organizations table...');
      await connection.query('ALTER TABLE organizations ADD COLUMN email VARCHAR(190)');
      console.log('✓ email column added\n');
    } else {
      console.log('✓ email column already exists\n');
    }

    // Add supervisor info to organizations if it doesn't exist
    const [columns2] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'supervisor_name'"
    );
    
    if (!columns2.length) {
      console.log('Adding supervisor columns to organizations table...');
      await connection.query('ALTER TABLE organizations ADD COLUMN supervisor_name VARCHAR(120)');
      await connection.query('ALTER TABLE organizations ADD COLUMN supervisor_email VARCHAR(190)');
      await connection.query('ALTER TABLE organizations ADD COLUMN supervisor_phone VARCHAR(20)');
      console.log('✓ supervisor columns added\n');
    } else {
      console.log('✓ supervisor columns already exist\n');
    }

    // Add logo to organizations if it doesn't exist
    const [columns3] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations' AND COLUMN_NAME = 'organization_logo_file_name'"
    );
    
    if (!columns3.length) {
      console.log('Adding logo columns to organizations table...');
      await connection.query('ALTER TABLE organizations ADD COLUMN organization_logo_file_name VARCHAR(255)');
      await connection.query('ALTER TABLE organizations ADD COLUMN organization_logo_mime_type VARCHAR(120)');
      await connection.query('ALTER TABLE organizations ADD COLUMN organization_logo_blob LONGBLOB');
      console.log('✓ logo columns added\n');
    } else {
      console.log('✓ logo columns already exist\n');
    }

    // Add profile photo to users if it doesn't exist
    const [columns4] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_photo_file_name'"
    );
    
    if (!columns4.length) {
      console.log('Adding profile photo columns to users table...');
      await connection.query('ALTER TABLE users ADD COLUMN profile_photo_file_name VARCHAR(255)');
      await connection.query('ALTER TABLE users ADD COLUMN profile_photo_mime_type VARCHAR(120)');
      await connection.query('ALTER TABLE users ADD COLUMN profile_photo_blob LONGBLOB');
      console.log('✓ profile photo columns added\n');
    } else {
      console.log('✓ profile photo columns already exist\n');
    }

    // Add profile photo to applicants if it doesn't exist
    const [columns5] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'applicants' AND COLUMN_NAME = 'profile_photo_file_name'"
    );
    
    if (!columns5.length) {
      console.log('Adding profile photo columns to applicants table...');
      await connection.query('ALTER TABLE applicants ADD COLUMN profile_photo_file_name VARCHAR(255)');
      await connection.query('ALTER TABLE applicants ADD COLUMN profile_photo_mime_type VARCHAR(120)');
      await connection.query('ALTER TABLE applicants ADD COLUMN profile_photo_blob LONGBLOB');
      console.log('✓ profile photo columns added\n');
    } else {
      console.log('✓ profile photo columns already exist\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All database migrations completed successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
