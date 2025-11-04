import { User } from "../models/userModel.js";
import bcrypt from "bcryptjs";

// GET /api/users - list all users (admin)
export const listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    const mapped = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data user", error: err.message });
  }
};

// POST /api/users - create a user (admin)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Nama dan email wajib diisi" });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email sudah terdaftar" });
    const tempPassword = password || Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: role === "admin" ? "admin" : "user" });
    res.status(201).json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      tempPassword: password ? undefined : tempPassword,
    });
  } catch (err) {
    res.status(500).json({ message: "Gagal membuat user", error: err.message });
  }
};

// PATCH /api/users/:id - update user fields (admin)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, active } = req.body;
    const set = {};
    if (name !== undefined) set.name = name;
    if (email !== undefined) set.email = email.toLowerCase();
    if (role !== undefined) set.role = role === "admin" ? "admin" : "user";
    if (active !== undefined) set.active = !!active;
    const updated = await User.findByIdAndUpdate(id, { $set: set }, { new: true });
    if (!updated) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json({
      id: updated._id.toString(),
      name: updated.name,
      email: updated.email,
      role: updated.role,
      active: updated.active,
    });
  } catch (err) {
    res.status(500).json({ message: "Gagal memperbarui user", error: err.message });
  }
};

// POST /api/users/:id/reset-password - reset password (admin)
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    const tempPassword = newPassword || Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const updated = await User.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true });
    if (!updated) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json({ message: "Password berhasil direset", tempPassword: newPassword ? undefined : tempPassword });
  } catch (err) {
    res.status(500).json({ message: "Gagal reset password", error: err.message });
  }
};

// POST /api/auth/change-password - self change password (auth)
export const changeMyPassword = async (req, res) => {
  try {
    const userSession = req.session?.user;
    if (!userSession) return res.status(401).json({ message: "Harus login" });
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ message: "Password lama dan baru wajib diisi" });
    const user = await User.findById(userSession.id);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Password lama salah" });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password berhasil diubah" });
  } catch (err) {
    res.status(500).json({ message: "Gagal mengubah password", error: err.message });
  }
};

// DELETE /api/users/:id - delete user (admin)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session?.user?.id;
    if (currentUserId && currentUserId === id) {
      return res.status(400).json({ message: "Tidak dapat menghapus akun sendiri" });
    }
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json({ message: "User berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus user", error: err.message });
  }
};
