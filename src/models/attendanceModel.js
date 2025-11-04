import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, required: true },
  date: { type: String, required: true },
  checkIn: { type: String },
  checkOut: { type: String },
  status: { type: String, default: "Hadir" },
  photoUrl: { type: String },
}, { timestamps: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
