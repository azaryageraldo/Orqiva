# FlowPilot AI

Platform SaaS AI Workflow Automation (MVP portfolio). Pengguna menyusun alur otomatisasi melalui editor visual berbasis node, menyimpan workflow, menjalankannya di backend, dan menggunakan Gemini AI untuk langkah klasifikasi/generasi respons.

## Teknologi

- Backend: PHP 8.3+ + Laravel 13, MySQL 8
- Frontend: React + TypeScript + Vite, React Flow, Tailwind CSS
- AI: Google Gemini API (hanya melalui backend)

## Instalasi cepat

Prasyarat: PHP 8.3+, Composer, Node.js/npm, MySQL 8.

```sh
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Sesuaikan DB dan GEMINI_API_KEY di .env
php artisan migrate
php artisan serve

# Frontend (terminal lain)
cd ../frontend
npm install
npm run dev
```

Backend berjalan di `http://127.0.0.1:8000`; frontend di Vite (default `5173`) dan proxies `/api` ke backend. Semua endpoint workflow, eksekusi, dan statistik memerlukan sesi login (Sanctum); data dibatasi pada pemilik workflow.

## Test

```sh
cd backend
php artisan test
```

Test memakai SQLite in-memory dan memock Gemini, jadi tidak membutuhkan kredensial maupun menyentuh database lokal.

Detail lengkap: [`README-SETUP.md`](README-SETUP.md).

## Struktur penting yang di-commit

- `backend/` — Laravel API (kecuali `vendor/`, `.env`, `storage/*`, `bootstrap/cache/*`, `public/build/`)
- `frontend/` — React/Vite (kecuali `node_modules/`, `dist/`, `.vite/`)
- `.env.example` — placeholder konfigurasi (tidak ada kredensial nyata)
- `README.md`, `README-SETUP.md`, `AGENTS.md`

File `.env`, `vendor/`, `node_modules/`, `dist/`, dan `storage/logs` **tidak** di-commit (lihat `.gitignore`).

## Lisensi

Private / portfolio.# AI-Automation-Project
