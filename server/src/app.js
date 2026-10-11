import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import resumeRoutes from "./routes/resumes.js";
import { apiError } from "./utils/http.js";
import { isAllowedOrigin } from "./utils/originPolicy.js";
export const app = express();
app.set("trust proxy", 1);
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        ...(process.env.NODE_ENV === "production"
          ? { upgradeInsecureRequests: [] }
          : {}),
      },
    },
  }),
);
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
// Defense in depth for cookie-authenticated mutations: reject browser requests from untrusted origins.
// Requests without Origin remain usable for trusted server-to-server clients and automated tests.
app.use((req, res, next) => {
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(req.method) ||
    !req.headers.origin
  )
    return next();
  if (!isAllowedOrigin(req.headers.origin, allowedOrigin))
    return res
      .status(403)
      .json({
        error: {
          code: "ORIGIN_REJECTED",
          message: "This request origin is not allowed.",
        },
      });
  next();
});
app.get("/api/health", (_req, res) => res.json({ data: { status: "ok" } }));
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use((req, res) =>
  apiError(res, 404, "NOT_FOUND", "The requested endpoint was not found."),
);
app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err?.name === "MulterError" && err.code === "LIMIT_FILE_SIZE")
    return apiError(
      res,
      413,
      "FILE_TOO_LARGE",
      "The file is too large. Choose a smaller resume file.",
    );
  if (err?.name === "MulterError")
    return apiError(
      res,
      400,
      "UPLOAD_ERROR",
      "The upload could not be processed. Check the file and try again.",
    );
  console.error("Request failed:", err.message);
  apiError(
    res,
    err.status || 500,
    err.code || "INTERNAL_ERROR",
    err.status && err.status < 500
      ? err.message
      : "Something went wrong. Please try again.",
  );
});
