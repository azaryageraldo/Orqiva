# FlowPilot AI — Local Setup

Repository ini berisi MVP yang sudah berjalan: autentikasi Sanctum, CRUD workflow dengan kepemilikan per pengguna, editor visual berbasis React Flow, eksekusi workflow dengan Gemini, chat tester, statistik penggunaan token, serta audit eksekusi per langkah.

## Requirements

- PHP 8.3+ dengan ekstensi PDO MySQL (dan PDO SQLite untuk menjalankan test)
- Composer
- Node.js dan npm
- MySQL 8 (gunakan layanan lokal yang sudah ada)
- Gemini API key (hanya disimpan di backend)

## Install dependencies

Dari root repository:

```sh
cd backend && composer install
cp .env.example .env
php artisan key:generate
```

Isi koneksi MySQL dan `GEMINI_API_KEY` di `backend/.env`. Kunci API tidak boleh diletakkan di frontend.

```sh
cd ../frontend
npm install
```

## Siapkan database

```sh
cd backend
php artisan migrate
```

Migrasi ini juga membuat tabel `workflow_execution_steps` untuk audit per langkah. Jalankan ulang `php artisan migrate` setelah memperbarui repository.

Belum ada endpoint registrasi. Buat pengguna pertama (atau gunakan seeder demo):

```sh
php artisan db:seed --class=AdminUserSeeder
# email: admin@gmail.com — ganti password sebelum dipakai di luar lokal
```

## Jalankan

Di dua terminal terpisah, dari `backend/` jalankan `php artisan serve`, dan dari `frontend/` jalankan `npm run dev`. Vite mem-proxy `/api` ke `http://127.0.0.1:8000`. Semua endpoint workflow dan statistik memerlukan sesi login.

Build produksi frontend: `npm run build` dari `frontend/`. Endpoint kesehatan backend: `GET /up` dan `GET /api/v1/health`.

Halaman **Activity** menampilkan riwayat eksekusi dengan filter status dan rentang tanggal, pagination "Muat lebih banyak", serta detail audit per langkah (input, output, variabel, pesan, token, dan error). Eksekusi lama yang dibuat sebelum tabel audit ada tetap bisa dibuka dengan ringkasan log lama.

## Test

```sh
cd backend
php artisan test
```

Test berjalan pada SQLite in-memory (lihat `phpunit.xml`) sehingga tidak menyentuh data MySQL lokal. Panggilan Gemini dimock di test, jadi tidak butuh kredensial atau kuota.
