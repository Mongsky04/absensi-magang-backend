import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import { connectDB } from "./config/db.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();
connectDB();

// Konfigurasi CORS untuk multiple origins
const corsOrigins = process.env.CORS_ORIGIN.split(',');
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Session terpisah untuk admin vs user agar cookie tidak saling menimpa
const defaultSession = session({
  name: "connect.sid",
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 8,
  },
});
const adminSession = session({
  name: "admin.sid",
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 8,
  },
});

// Terapkan session admin khusus pada prefix /api/admin
app.use("/api/admin", adminSession);
// Terapkan session default pada semua /api kecuali /api/admin
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/admin")) return next();
  return defaultSession(req, res, next);
});

app.get("/", (req, res) => res.send("✅ JJC Backend (MongoDB + Cloudinary) Running!"));
// Admin routes (menggunakan cookie admin.sid)
app.use("/api/admin/auth", authRoutes);
app.use("/api/admin/users", userRoutes);

// User routes (menggunakan cookie connect.sid)
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
