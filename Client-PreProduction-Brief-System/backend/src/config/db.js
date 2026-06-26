const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

let pool;
let sqliteDb = null;
let isSQLite = false;

// Create PG Pool
pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'digiquest_briefs',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  connectionTimeoutMillis: 1500 // Quick timeout
});

// Query Translator for SQLite compatibility
const translateQuery = (sql) => {
  if (!isSQLite) return sql;

  let translated = sql;

  // 1. Translate positional parameters ($1, $2) to (?) and order them
  // We handle duplicates by mapping parameter values dynamically in the query wrapper.
  
  // 2. Translate ILIKE to LIKE (case-insensitive by default in SQLite)
  translated = translated.replace(/\bILIKE\b/gi, 'LIKE');

  // 3. Translate JSONB properties ->> to json_extract
  translated = translated.replace(/(\w+)\.new_value->>'status'/g, "json_extract($1.new_value, '$.status')");
  translated = translated.replace(/al\.new_value->>'status'/g, "json_extract(al.new_value, '$.status')");

  // 4. Translate TO_CHAR(created_at, 'YYYY-MM') -> strftime('%Y-%m', created_at)
  translated = translated.replace(/TO_CHAR\((.*?), \s*'YYYY-MM'\)/gi, "strftime('%Y-%m', $1)");

  // 5. Translate EXTRACT(EPOCH FROM (al.timestamp - b.created_at))/3600 -> julianday hours diff
  translated = translated.replace(/EXTRACT\(EPOCH FROM \((.*?)\)\)\/3600/gi, (match, p1) => {
    const parts = p1.split('-');
    if (parts.length === 2) {
      return `(julianday(${parts[0].trim()}) - julianday(${parts[1].trim()})) * 24`;
    }
    return match;
  });

  // 6. Translate NOW() - INTERVAL 'X units' to datetime('now', '-X units')
  translated = translated.replace(/NOW\(\)\s*-\s*INTERVAL\s+'(\d+)\s+(\w+)'/gi, "datetime('now', '-$1 $2')");

  // 7. Translate NOW() to datetime('now')
  translated = translated.replace(/\bNOW\(\)/gi, "datetime('now')");

  return translated;
};

// SQLite DB Initialization & Schema/Seed Setup
const initSQLite = () => {
  const sqlite3 = require('sqlite3').verbose();
  const dbFile = path.join(__dirname, '../database.sqlite');
  
  console.log('================================================================');
  console.log(`[Database] PostgreSQL is offline. Booting SQLite Autopilot...`);
  console.log(`[Database] Database File: ${dbFile}`);
  console.log('================================================================');

  sqliteDb = new sqlite3.Database(dbFile);
  isSQLite = true;

  // Enable foreign keys
  sqliteDb.run('PRAGMA foreign_keys = ON');

  // Check if schema exists
  sqliteDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", async (err, table) => {
    if (err) {
      console.error('[SQLite] Error checking table schema:', err);
      return;
    }

    if (!table) {
      console.log('[SQLite] Table schema not found. Initializing database schema...');
      try {
        const schemaPath = path.join(__dirname, '../../../database/schema.sql');
        const seedPath = path.join(__dirname, '../../../database/seed.sql');

        let schemaSql = fs.readFileSync(schemaPath, 'utf8');
        let seedSql = fs.readFileSync(seedPath, 'utf8');

        // Strip out PostgreSQL function definitions and triggers
        schemaSql = schemaSql.replace(/CREATE OR REPLACE FUNCTION[\s\S]*?language\s+['"]?plpgsql['"]?\s*;/gi, '');
        schemaSql = schemaSql.replace(/CREATE TRIGGER[\s\S]*?;/gi, '');

        // Translate schemaSql to SQLite dialect
        const statements = schemaSql
          .split(';')
          .map(s => s.trim())
          .filter(Boolean);

        const sqliteSchema = statements.map(s => {
          let temp = s;
          temp = temp.replace(/\bSERIAL\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
          temp = temp.replace(/\bJSONB\b/gi, 'TEXT');
          temp = temp.replace(/\bDROP\s+TABLE\s+IF\s+EXISTS\s+(\w+)\s+CASCADE\b/gi, 'DROP TABLE IF EXISTS $1');
          return temp;
        }).join(';\n') + ';';

        // Run Schema
        sqliteDb.exec(sqliteSchema, (err1) => {
          if (err1) {
            console.error('[SQLite] Schema setup failed:', err1);
            return;
          }
          console.log('[SQLite] Schema created successfully. Seeding database data...');
          
          // Seed database (SQLite handles standard insertions directly)
          sqliteDb.exec(seedSql, (err2) => {
            if (err2) {
              console.error('[SQLite] Seeding failed:', err2);
            } else {
              console.log('[SQLite] Database seeded successfully! Ready to login.');
            }
          });
        });

      } catch (fileErr) {
        console.error('[SQLite] Failed to read schema or seed SQL files:', fileErr);
      }
    } else {
      sqliteDb.run("ALTER TABLE comments ADD COLUMN reactions TEXT DEFAULT '{}'", (err) => {
        // Ignored if already exists
      });
      console.log('[SQLite] Schema found. Checking if database is seeded...');
      sqliteDb.get("SELECT COUNT(*) as count FROM users", (countErr, row) => {
        if (countErr) {
          console.error('[SQLite] Error checking user count:', countErr);
          return;
        }
        if (!row || row.count === 0) {
          console.log('[SQLite] Database is empty. Seeding mock data...');
          try {
            const seedPath = path.join(__dirname, '../../../database/seed.sql');
            let seedSql = fs.readFileSync(seedPath, 'utf8');
            sqliteDb.exec(seedSql, (err2) => {
              if (err2) {
                console.error('[SQLite] Seeding failed:', err2);
              } else {
                console.log('[SQLite] Database seeded successfully! Ready to login.');
              }
            });
          } catch (fileErr) {
            console.error('[SQLite] Failed to read seed SQL file:', fileErr);
          }
        } else {
          console.log(`[SQLite] Database already seeded with ${row.count} users.`);
        }
      });
    }
  });
};

// Main Query Wrapper supporting both PG and SQLite
const query = (text, params = []) => {
  if (isSQLite) {
    return new Promise((resolve, reject) => {
      const translatedSql = translateQuery(text);
      
      // Map $1, $2, $3 to ? positional variables, handling duplicates dynamically
      let mappedParams = [];
      const matches = text.match(/\$[0-9]+/g);
      let sqliteSql = translatedSql;
      
      const processParam = (p) => {
        if (p instanceof Date) {
          // sqlite3 expects string/ISO format for Dates to work cleanly with datetime comparisons
          // Format Date to 'YYYY-MM-DD HH:MM:SS.SSS' which matches standard SQLite datetime representation
          return p.toISOString().replace('T', ' ').replace('Z', '');
        }
        return p;
      };
      
      if (matches) {
        sqliteSql = translatedSql.replace(/\$([0-9]+)/g, (match, num) => {
          const idx = parseInt(num, 10) - 1;
          mappedParams.push(processParam(params[idx]));
          return '?';
        });
      } else {
        mappedParams = params.map(processParam);
      }

      sqliteDb.all(sqliteSql, mappedParams, (err, rows) => {
        if (err) {
          console.error('[SQLite Error] SQL:', sqliteSql, 'Error:', err.message);
          reject(err);
        } else {
          // Process rows to parse old_value and new_value strings into objects
          const processedRows = (rows || []).map(row => {
            const newRow = { ...row };
            if (typeof newRow.old_value === 'string') {
              try {
                newRow.old_value = JSON.parse(newRow.old_value);
              } catch (e) {
                // Ignore if not valid JSON
              }
            }
            if (typeof newRow.new_value === 'string') {
              try {
                newRow.new_value = JSON.parse(newRow.new_value);
              } catch (e) {
                // Ignore
              }
            }
            if (typeof newRow.reactions === 'string') {
              try {
                newRow.reactions = JSON.parse(newRow.reactions);
              } catch (e) {
                // Ignore
              }
            }
            return newRow;
          });

          // Emulate node-postgres response structure: { rows: [...] }
          resolve({ rows: processedRows });
        }
      });
    });
  }

  // PostgreSQL wrapper
  return pool.query(text, params);
};

// Check connection (Skip auto-init in tests to prevent open TCP handles)
const initDatabase = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('================================================================');
    console.log(`[Database] PostgreSQL connected successfully (Time: ${res.rows[0].now})`);
    console.log('================================================================');
    // Ensure column exists in PG
    await pool.query("ALTER TABLE comments ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'");
  } catch (err) {
    initSQLite();
  }
};

if (process.env.NODE_ENV !== 'test') {
  initDatabase();
}

module.exports = {
  query,
  pool,
  getIsSQLite: () => isSQLite
};
