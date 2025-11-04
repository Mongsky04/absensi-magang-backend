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
  [[...slug]].js    # Vercel serverless catch-all (semua path → Express app)
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

## Deploy ke Vercel (serverless)

1. Buat project baru di Vercel dan pilih repo ini.
2. Set “Root Directory” ke folder `backend` (bukan `src`, bukan `api`).
3. Biarkan Build Command default (tidak ada build khusus). Output directory kosong.
4. Isi Environment Variables (Production & Preview): lihat bagian di atas.
5. Deploy.

Verifikasi setelah deploy:

- `https://<your-backend>.vercel.app/` → landing page backend.
- `https://<your-backend>.vercel.app/api/health` → `{ status: "ok", db: "connected" }`.

Catatan: Jangan gunakan `vercel.json` di setup ini; gunakan file-based routing `api/[[...slug]].js` sebagai catch-all sehingga semua path ditangani Express.

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
