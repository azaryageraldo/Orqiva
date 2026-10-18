# FlowPilot AI — Local Setup

The repository is being initialized in phases. The current foundation contains a Laravel API shell and a React/Vite frontend; workflow persistence, CRUD, and execution are not implemented yet.

## Requirements

- PHP 8.3+ with PDO MySQL and common Laravel extensions
- Composer
- Node.js and npm
- MySQL 8 (use an existing local service; this project does not start or reconfigure one)

## Install dependencies

From the repository root:

```sh
cd backend && composer install
cp .env.example .env
php artisan key:generate
```

Set the local MySQL connection values in `backend/.env`. Keep the Gemini key in this backend file only; it is not needed for the current foundation.

```sh
cd ../frontend
npm install
cp .env.example .env
```

## Run locally

In separate terminals, from `backend/` run `php artisan serve`, and from `frontend/` run `npm run dev`. Vite proxies `/api` to `http://127.0.0.1:8000` by default. The starter UI checks `GET /api/v1/health`; workflow controls remain disabled until the workflow API is implemented.

Frontend production bundle: `npm run build` from `frontend/`. Backend smoke endpoint: `GET /up` and `GET /api/v1/health`.
