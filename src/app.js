import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import { connectDB } from "./config/db.js";
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

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || "").split(",").filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or curl (no origin)
    if (!origin) return callback(null, true);
    // If no whitelist provided, allow all (useful for initial prod deploys)
    if (corsOrigins.length === 0) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
};
app.use(cors(corsOptions));
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

// Health
app.get("/", (req, res) => res.send("✅ JJC Backend (MongoDB + Cloudinary) Running!"));

// Routes
app.use("/api/admin/auth", authRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

export default app;
