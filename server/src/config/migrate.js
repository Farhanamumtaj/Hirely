import "dotenv/config";
import { readFile } from "node:fs/promises";
import { pool } from "./db.js";
try {
  const sql = await readFile(
    new URL("../../migrations/001_initial_schema.sql", import.meta.url),
    "utf8",
  );
  await pool.query(sql);
  await pool.query(
    "INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT(name) DO NOTHING",
    ["001_initial_schema.sql"],
  );
  console.log("Migration 001_initial_schema.sql applied.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
