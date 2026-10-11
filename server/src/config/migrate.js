import "dotenv/config";
import { readFile } from "node:fs/promises";
import { pool } from "./db.js";

const migrations = ["001_initial_schema.sql", "002_email_verification.sql"];

try {
  await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);
  for (const name of migrations) {
    const applied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [name],
    );

    if (applied.rowCount > 0) {
      console.log(`Migration ${name} already applied. Skipping.`);
      continue;
    }

    const sql = await readFile(
      new URL(`../../migrations/${name}`, import.meta.url),
      "utf8",
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT(name) DO NOTHING",
        [name],
      );
      await client.query("COMMIT");

      console.log(`Migration ${name} applied.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
