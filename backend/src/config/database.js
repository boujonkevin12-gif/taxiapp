const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

if (isProduction) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  async function query(sql, params = []) {
    const pgSql = convertPlaceholders(sql);
    return pool.query(pgSql, params);
  }

  module.exports = { query, pool };
} else {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, '..', '..', 'taxi.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  function query(sql, params = []) {
    const stmt = db.prepare(sql);
    const sqlUpper = sql.trim().toUpperCase();
    const hasReturn = sqlUpper.includes('RETURNING');
    const isSelect = sqlUpper.startsWith('SELECT');

    if (isSelect || hasReturn) {
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const result = stmt.run(...params);
      return { rows: [{ id: result.lastInsertRowid, changes: result.changes }] };
    }
  }

  module.exports = { query, db };
}
