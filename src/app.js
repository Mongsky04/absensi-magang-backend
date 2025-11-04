import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import { connectDB, getDBState, getDBStatus, isMongoUriConfigured, getLastDBError } from "./config/db.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

// Connect DB (safe for serverless cold starts; Mongoose manages pooling)
connectDB();

const app = express();
const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

// Trust proxy for secure cookies on Vercel/Proxies
app.set("trust proxy", 1);

// CORS (normalize whitelist; optional Vercel preview toggle)
const rawOrigins = (process.env.CORS_ORIGIN || "").split(",").filter(Boolean);
const corsOrigins = rawOrigins.map(o => o.trim().replace(/\/$/, "").toLowerCase());
const allowPreviews = (process.env.CORS_ALLOW_VERCEL_PREVIEWS || "0") === "1";
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server / curl
    const normalized = origin.trim().replace(/\/$/, "").toLowerCase();
    if (corsOrigins.length === 0) return callback(null, true);
    if (corsOrigins.includes(normalized)) return callback(null, true);
    if (allowPreviews && /https?:\/\/.*\.vercel\.app$/i.test(normalized)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
};
app.use(cors(corsOptions));
// Handle preflight generically without path-to-regexp patterns (Express v5 safe)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    // Fallback: ensure minimal CORS headers if not already set
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    const reqHeaders = req.headers["access-control-request-headers"]; 
    res.setHeader("Access-Control-Allow-Headers", reqHeaders || "Content-Type, Authorization");
    return res.sendStatus(204);
  }
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Session store (Mongo) — required for serverless environments
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  ttl: 60 * 60 * 8, // 8 hours
});

const sessionCommon = {
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd, // secure cookies on HTTPS in production
    maxAge: 1000 * 60 * 60 * 8,
  },
};

const defaultSession = session({
  name: "connect.sid",
  ...sessionCommon,
});
const adminSession = session({
  name: "admin.sid",
  ...sessionCommon,
});

// Apply sessions by prefix
app.use("/api/admin", adminSession);
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/admin")) return next();
  return defaultSession(req, res, next);
});

// Pretty Landing Page at root
app.get("/", async (req, res) => {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  // Try to ensure connection before reporting status
  if (getDBState() !== 1) {
    await connectDB();
  }
  const { state, label } = getDBStatus();
  const dbReady = state === 1;
  const now = new Date();
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const html = `<!doctype html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Absensi Magang • Backend</title>
      <style>
        :root{--bg:#0f172a;--card:#0b1220;--muted:#94a3b8;--ok:#22c55e;--warn:#f59e0b;--err:#ef4444;--link:#60a5fa}
        *{box-sizing:border-box}body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji";background:linear-gradient(180deg,#0b1020,#0f172a);color:white}
        .wrap{max-width:900px;margin:40px auto;padding:0 20px}
        .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;backdrop-filter: blur(6px)}
        h1{font-size:28px;margin:0 0 8px}
        p.subtitle{margin:0 0 16px;color:var(--muted)}
        .grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:16px}
        .pill{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:var(--muted)}
        a{color:var(--link);text-decoration:none}
        .ok{color:var(--ok)}.warn{color:var(--warn)}.err{color:var(--err)}
        footer{margin-top:20px;color:var(--muted);font-size:12px}
        ul{margin:8px 0 0 18px;padding:0}
        li{margin:6px 0}
        code{background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:6px}
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <h1>✅ Absensi Magang • Backend</h1>
          <p class="subtitle">API server aktif dan siap dipakai.</p>
          <div class="grid">
            <div class="card">
              <h3>Status</h3>
              <ul>
                <li>Lingkungan: <strong>${isProd ? "Production" : "Development"}</strong></li>
                <li>Database: <strong class="${dbReady ? "ok" : (state === 2 ? "warn" : "err")}">${label}</strong></li>
                <li>Waktu server: <code>${now.toLocaleString("id-ID")}</code></li>
              </ul>
              <p class="pill">Cookie SameSite: ${isProd ? "None; Secure" : "Lax"}</p>
              <p class="pill">MONGO_URI: ${isMongoUriConfigured() ? "configured" : "missing"}</p>
              ${dbReady ? "" : `<p style="margin-top:8px;color:var(--muted);font-size:12px">${isMongoUriConfigured() ? "Gagal konek ke MongoDB. Cek Network Access (Atlas IP allowlist) & kredensial." : "Set variabel lingkungan MONGO_URI di server."}</p>`}
            </div>
            <div class="card">
              <h3>Endpoints (User)</h3>
              <ul>
                <li><a href="${baseUrl}/api/auth/me">GET /api/auth/me</a></li>
                <li>POST /api/auth/login</li>
                <li>POST /api/auth/logout</li>
                <li><a href="${baseUrl}/api/attendance/my">GET /api/attendance/my</a></li>
                <li><a href="${baseUrl}/api/attendance/my/summary">GET /api/attendance/my/summary</a></li>
                <li>GET /api/attendance/my/rekap?monthKey=YYYY-MM</li>
              </ul>
            </div>
            <div class="card">
              <h3>Endpoints (Admin)</h3>
              <ul>
                <li>POST /api/admin/auth/login</li>
                <li><a href="${baseUrl}/api/attendance">GET /api/attendance</a> <span class="pill">admin-only</span></li>
                <li>CRUD /api/admin/users <span class="pill">admin-only</span></li>
              </ul>
            </div>
          </div>
          <footer>
            Tips: gunakan header <code>Credentials: include</code> di browser dan set <code>CORS_ORIGIN</code> sesuai domain frontend Anda.
          </footer>
        </div>
        <div style="height:16px"></div>
        <div class="card">
          <h3>Healthcheck</h3>
          <p>Cek status cepat: <a href="${baseUrl}/api/health">GET /api/health</a></p>
        </div>
      </div>
    </body>
  </html>`;
  res.set("Content-Type", "text/html; charset=utf-8").status(200).send(html);
});

// JSON Health endpoint (attempts reconnect if disconnected)
app.get("/api/health", async (req, res) => {
  const before = getDBState();
  if (before !== 1) {
    await connectDB();
  }
  const { state, label } = getDBStatus();
  const isProdEnv = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  res.json({
    status: "ok",
    db: label.toLowerCase(),
    state,
    mongoUriConfigured: isMongoUriConfigured(),
    error: state === 1 ? null : (isProdEnv ? undefined : getLastDBError() || null),
    time: new Date().toISOString(),
  });
});

// Routes
app.use("/api/admin/auth", authRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

export default app;
