import "dotenv/config";
import { app } from "./app.js";
import { pool } from "./config/db.js";
const port = Number(process.env.PORT || 4000);
if (
  !process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_ACCESS_SECRET.length < 32
) {
  console.error(
    "JWT_ACCESS_SECRET must be configured with at least 32 characters.",
  );
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be configured.");
  process.exit(1);
}
const server = app.listen(port, () =>
  console.log(`Hirely API listening on port ${port}`),
);
async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
