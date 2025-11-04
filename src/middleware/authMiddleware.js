export const requireAuth = (req, res, next) => {
  if (req.session?.user) return next();
  return res.status(401).json({ message: "Harus login" });
};

export const isAdmin = (req, res, next) => {
  const role = req.session?.user?.role;
  if (role === "admin") return next();
  return res.status(403).json({ message: "Hanya admin yang diizinkan" });
};
