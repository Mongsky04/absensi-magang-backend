import { User } from "../models/userModel.js";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
  try {
    const { adminSecret } = req.body;
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Tidak diizinkan" });
    }
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Data tidak lengkap" });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email sudah terdaftar" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: role || "user" });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Gagal registrasi", error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email dan password wajib diisi" });
    const user = await User.findOne({ email: email.toLowerCase(), active: true });
    if (!user) return res.status(401).json({ message: "Email atau password salah" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Email atau password salah" });
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    res.json({ user: req.session.user });
  } catch (err) {
    res.status(500).json({ message: "Gagal login", error: err.message });
  }
};

export const me = (req, res) => {
  if (req.session?.user) return res.json({ user: req.session.user });
  return res.status(401).json({ message: "Belum login" });
};

export const logout = (req, res) => {
  req.session?.destroy(() => {
    res.clearCookie("connect.sid");
    return res.json({ message: "Logout berhasil" });
  });
};
