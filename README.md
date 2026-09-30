# Jobhunt Fullstack

Monorepo aplikasi Express dan React yang dikelola dengan Bun.

## Prasyarat

- Bun 1.3 atau lebih baru
- MySQL 8 atau lebih baru

## Instalasi

```sh
bun install

cd backend
bun install

cd ../frontend
bun install
```

## Database

Buat database dan tabel:

```sh
mysql -u root -p < backend/src/config/schema.sql
```

Skrip ini aman dijalankan ulang karena memakai `IF NOT EXISTS`.
Sesuaikan kredensial database pada `backend/.env`. Backend juga memerlukan `JWT_SECRET` minimal 32 byte; buat nilai acak dengan `openssl rand -hex 32`.

## Menjalankan aplikasi

Jalankan backend dan frontend sekaligus dari root:

```sh
bun run dev
```

Atau jalankan terpisah di terminal masing-masing:

Backend:

```sh
bun run dev:backend
```

Frontend:

```sh
bun run dev:frontend
```

Endpoint pemeriksaan backend: `http://localhost:3000/api/health`.
