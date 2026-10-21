# Orqiva — Local Setup

Orqiva is an AI customer service automation workspace with Sanctum authentication, per-user workflow ownership, a React Flow editor, resumable workflow execution, BYOK provider management, a public chat widget, an inbox with human handoff, token statistics, and per-step execution audit logs.

## Requirements

- PHP 8.3+ with PDO MySQL (and PDO SQLite for tests)
- Composer
- Node.js and npm
- MySQL 8, or SQLite for a lightweight local setup
- A Google Gemini, OpenAI, or OpenRouter API key

## Install dependencies

From the repository root:

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate

cd ../frontend
npm install
```

Configure the database in `backend/.env`. AI provider keys are not required in `.env`; add them from **API Keys** after signing in.

## Prepare the database

```sh
cd backend
php artisan migrate
php artisan db:seed --class=AdminUserSeeder
```

Default local account:

- Email: `admin@gmail.com`
- Password: `dsadsadsa`

There is no public registration or password reset flow. Change the default credentials before using Orqiva outside local development.

Optional demo data for a PlayStation store workflow:

```sh
php artisan db:seed --class=PsStoreWorkflowsSeeder
```

Warning: that seeder removes existing workflows and contacts for the target admin account.

## Run

Start the backend and frontend in separate terminals:

```sh
cd backend
php artisan serve
```

```sh
cd frontend
npm run dev
```

The frontend runs at `http://127.0.0.1:5173` and proxies `/api` to `http://127.0.0.1:8000`. Health endpoints: `GET /up` and `GET /api/v1/health`.

For a production build:

```sh
cd frontend
npm run build
```

## Main areas

- **Dashboard** — workflow and execution summary
- **Workflows** — create, validate, and edit visual workflows
- **Inbox** — take over conversations and hand them back to AI
- **Channel** — configure the website widget and copy its embed snippet
- **Audit Log** — inspect execution steps, tokens, variables, and errors
- **API Keys** — connect Gemini, OpenAI, or OpenRouter with encrypted BYOK keys
- **Settings** — account, language, theme, service status, and help
- **Help & Support** — setup, node reference, channel guide, FAQ, and license

## Tests

```sh
cd backend
php artisan test
```

Tests run against in-memory SQLite as configured in `phpunit.xml`, so they never touch local MySQL data. AI providers are mocked and do not require credentials or quota.

Frontend checks:

```sh
cd frontend
npm run lint
npm run build
```

## Production checklist

- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Use a strong `APP_KEY` and back it up securely.
- Change the default admin email and password.
- Serve the app over HTTPS and set `CORS_ALLOWED_ORIGINS` to trusted frontend origins.
- Use a production database and queue/scheduler setup appropriate to your traffic.
- Back up the database regularly.

## License

MIT License. Copyright (c) 2026 Azarya Geraldo.
