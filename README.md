# Absensi Magang • Backend

Express + MongoDB + Cloudinary backend for attendance app. Serverless-ready for Vercel with session-based auth.

## Struktur

```
src/
  app.js            # Inisialisasi Express app (CORS, session, routes)
  index.js          # Local/dev entry (app.listen)
  config/
    db.js           # Koneksi MongoDB (resilient untuk serverless)
  controllers/      # Auth, attendance, user
  models/           # Mongoose schemas
  routes/           # Express routers
api/
  index.js          # Vercel serverless entry (delegasi ke app)
vercel.json         # Rewrites semua path ke /api/index.js
```

## Environment Variables

Buat file `.env` (untuk lokal) berdasarkan `.env.example`.

Wajib di Vercel (Production env):

- `MONGO_URI`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SESSION_SECRET`
- `ADMIN_SECRET`
- `CORS_ORIGIN` daftar domain frontend/admin, koma-separator
  - Contoh: `https://absensi-magang-frontend.vercel.app,https://absensi-magang-admin.vercel.app`

Catatan:

- Production cookies: `SameSite=None; Secure` (sudah diatur otomatis) agar sesi lintas domain berfungsi.
- `trust proxy` aktif untuk Vercel.

## Jalankan Lokal

1. Install deps

```bash
npm install
```

2. Jalankan dev server

```bash
npm run dev
```

3. Akses

- `http://localhost:4000/` → landing page backend
- `http://localhost:4000/api/health` → health JSON

## Deploy Vercel

- Hubungkan repo backend ke Vercel.
- Root Directory: root repo backend (yang memiliki folder `api/`).
- Build Command: kosongkan (serverless Node tidak butuh build).
- Pastikan Environment Variables diisi (bagian di atas).
- Deploy ulang.

Verifikasi:

- `https://<your-backend>.vercel.app/api/health` → `{ status: "ok", db: "connected" }`
- `https://<your-backend>.vercel.app/` → tampil landing page.

## Endpoint Utama

- Auth (user):
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
  - `POST /api/auth/register` (proteksi `ADMIN_SECRET`)
  - `POST /api/auth/change-password` (auth)
- Attendance:
  - `GET /api/attendance/my` (auth)
  - `GET /api/attendance/my/summary` (auth)
  - `GET /api/attendance/my/rekap?monthKey=YYYY-MM` (auth)
  - `POST /api/attendance/checkin` (auth, hanya 07:00–08:00)
  - `PUT /api/attendance/checkout/:id` (auth, hanya 17:00–18:00)
  - `GET /api/attendance` (admin-only)
- Admin Users: `GET/POST/PATCH/POST(reset)/DELETE /api/admin/users` (admin-only)
