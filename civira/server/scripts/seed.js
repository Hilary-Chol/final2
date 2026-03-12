import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runSqlFile(connection, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await connection.query(sql);
  console.log(`Executed: ${path.basename(filePath)}`);
}

async function seed() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    const schemaPath = path.resolve('database/schema.sql');
    const seedPath = path.resolve('database/seed.sql');

    await runSqlFile(connection, schemaPath);

    if (fs.existsSync(seedPath)) {
      await runSqlFile(connection, seedPath);
    } else {
      console.warn('seed.sql not found. Skipped demo data insertion.');
    }

    console.log('Database seeding completed successfully.');
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
