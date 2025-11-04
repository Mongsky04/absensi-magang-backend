import { Attendance } from "../models/attendanceModel.js";
import cloudinary from "../config/cloudinary.js";

// 🟢 Check-in
export const checkIn = async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ message: "Foto wajib diisi" });
    const userSession = req.session?.user;
    if (!userSession) return res.status(401).json({ message: "Harus login" });

    // Validasi waktu check-in: 07:00–08:00 (inklusif menit akhir)
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const start = 7 * 60 + 0;   // 07:00
    const end = 8 * 60 + 0;     // 08:00
    if (minutesNow < start || minutesNow > end) {
      return res.status(403).json({ message: "Check-in hanya tersedia pukul 07:00–08:00" });
    }

    // Upload foto ke Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(photo, {
      folder: "jjc-attendance",
      public_id: `${(userSession.name || "user").replace(/\s/g, "_")}-${Date.now()}`,
    });

    const newRecord = await Attendance.create({
      user: userSession.id,
      name: userSession.name,
      date: new Date().toLocaleDateString("id-ID"),
      checkIn: new Date().toLocaleTimeString("id-ID", { hour12: false }),
      checkOut: null,
      status: "Hadir",
      photoUrl: uploadResponse.secure_url,
    });

    res.status(201).json({ message: "Check-in berhasil", record: newRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal check-in", error: err.message });
  }
};

// 🔵 Check-out
export const checkOut = async (req, res) => {
  try {
    const userSession = req.session?.user;
    if (!userSession) return res.status(401).json({ message: "Harus login" });
    // Validasi waktu check-out: 17:00–18:00 (inklusif menit akhir)
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const start = 17 * 60 + 0;  // 17:00
    const end = 18 * 60 + 0;    // 18:00
    if (minutesNow < start || minutesNow > end) {
      return res.status(403).json({ message: "Check-out hanya tersedia pukul 17:00–18:00" });
    }

  const id = req.params.id;
  const record = await Attendance.findById(id);
    if (!record) return res.status(404).json({ message: "Data tidak ditemukan" });
  // optional: batasi hanya pemilik bisa checkout
  if (record.user && record.user.toString() !== userSession.id) return res.status(403).json({ message: "Tidak diizinkan" });

    record.checkOut = new Date().toLocaleTimeString("id-ID", { hour12: false });
    await record.save();

    res.json({ message: "Check-out berhasil", record });
  } catch (err) {
    res.status(500).json({ message: "Gagal check-out", error: err.message });
  }
};

// 🧾 Ambil semua data
export const getAllAttendance = async (req, res) => {
  const data = await Attendance.find().sort({ createdAt: -1 });
  res.json(data);
};

export const getMyAttendance = async (req, res) => {
  const userSession = req.session?.user;
  if (!userSession) return res.status(401).json({ message: "Harus login" });
  const data = await Attendance.find({ user: userSession.id }).sort({ createdAt: -1 });
  res.json(data);
};

// 📊 Ringkasan bulanan
export const getSummary = async (req, res) => {
  try {
    const data = await Attendance.find();

    const summary = data.reduce((acc, item) => {
      // Gunakan createdAt agar konsisten, format "Month YYYY"
      const d = item.createdAt ? new Date(item.createdAt) : new Date();
      const monthYear = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!acc[monthYear]) acc[monthYear] = { hadir: 0, tidakHadir: 0 };
      if (item.status === "Hadir") {
        acc[monthYear].hadir++;
      } else {
        acc[monthYear].tidakHadir++;
      }
      return acc;
    }, {});

    const result = Object.entries(summary).map(([month, value]) => ({
      month,
      hadir: value.hadir,
      tidakHadir: value.tidakHadir,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil ringkasan", error: err.message });
  }
};

// 📊 Ringkasan bulanan (hanya user saat ini)
export const getMySummary = async (req, res) => {
  try {
    const userSession = req.session?.user;
    if (!userSession) return res.status(401).json({ message: "Harus login" });

    const data = await Attendance.find({ user: userSession.id });

    const monthMap = {
      Januari: "01",
      Februari: "02",
      Maret: "03",
      April: "04",
      Mei: "05",
      Juni: "06",
      Juli: "07",
      Agustus: "08",
      September: "09",
      Oktober: "10",
      November: "11",
      Desember: "12",
    };

    const summary = data.reduce((acc, item) => {
      const d = item.createdAt ? new Date(item.createdAt) : new Date();
      const month = d.toLocaleDateString("id-ID", { month: "long" });
      const year = d.getFullYear();
      const monthYear = `${month} ${year}`;
      const monthKey = `${year}-${monthMap[month]}`; // YYYY-MM

      if (!acc[monthKey]) acc[monthKey] = { month: monthYear, monthKey, hadir: 0, tidakHadir: 0 };
      if (item.status === "Hadir") acc[monthKey].hadir++;
      else acc[monthKey].tidakHadir++;
      return acc;
    }, {});

    const result = Object.values(summary).sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil ringkasan", error: err.message });
  }
};

// ⬇️ Download rekap CSV (hanya user saat ini, per bulan)
export const downloadMyRekap = async (req, res) => {
  try {
    const userSession = req.session?.user;
    if (!userSession) return res.status(401).json({ message: "Harus login" });

    const { monthKey } = req.query; // format: YYYY-MM
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ message: "Parameter monthKey wajib (format YYYY-MM)" });
    }

    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1; // 0-based

    const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

    const records = await Attendance.find({
      user: userSession.id,
      createdAt: { $gte: startDate, $lt: endDate },
    }).sort({ createdAt: 1 });

    // CSV header
    let csv = "Tanggal,Check-in,Check-out,Status\n";
    for (const r of records) {
      const d = r.createdAt ? new Date(r.createdAt) : new Date();
      const tanggal = d.toLocaleDateString("id-ID");
      const ci = r.checkIn || "";
      const co = r.checkOut || "";
      const st = r.status || "";
      csv += `${tanggal},${ci},${co},${st}\n`;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const safeName = (userSession.name || "user").replace(/[^a-z0-9_-]+/gi, "_");
    res.setHeader("Content-Disposition", `attachment; filename=rekap-${safeName}-${monthKey}.csv`);
    return res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengunduh rekap", error: err.message });
  }
};
