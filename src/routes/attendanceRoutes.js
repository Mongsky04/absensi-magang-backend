import express from "express";
import {
  getAllAttendance,
  getMyAttendance,
  checkIn,
  checkOut,
  getSummary,
  getMySummary,
  downloadMyRekap,
} from "../controllers/attendanceController.js";
import { requireAuth, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, isAdmin, getAllAttendance);
router.get("/my", requireAuth, getMyAttendance);
router.get("/my/summary", requireAuth, getMySummary);
router.get("/my/rekap", requireAuth, downloadMyRekap);
router.post("/checkin", requireAuth, checkIn);
router.put("/checkout/:id", requireAuth, checkOut);
router.get("/summary", getSummary);

export default router;
