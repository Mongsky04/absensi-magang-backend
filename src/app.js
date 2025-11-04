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

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || "").split(",").filter(Boolean);
app.use(cors({ origin: corsOrigins, credentials: true }));
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
    sameSite: "lax",
    secure: false, // set true behind HTTPS/Proxy
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
