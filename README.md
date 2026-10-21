# Orqiva

**Connect Intelligence. Automate Everything.**

Orqiva is an open-source, self-hostable AI customer service automation workspace. Build visual workflows, connect an AI agent, publish a website chat widget, and manage conversations from a single inbox.

## Features

- Visual workflow editor with stable node IDs, validation, branching, and cross-workflow routing
- BYOK AI providers: Google Gemini, OpenAI, and OpenRouter with encrypted per-user API keys
- Resumable workflow execution with per-step audit logs and checkpoint recovery
- Public website chat widget with embeddable snippet
- Human handoff and shared inbox for taking over AI conversations
- Usage statistics, token tracking, and execution history
- Dark and light themes with English and Indonesian interfaces

## Technology

- Backend: PHP 8.3+, Laravel 13, Sanctum, MySQL 8 or SQLite
- Frontend: React 19, TypeScript, Vite, React Flow, Tailwind CSS
- AI: Google Gemini, OpenAI, or OpenRouter using your own API key

## Quick start

Requirements: PHP 8.3+, Composer, Node.js/npm, and MySQL 8.

```sh
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Configure the database in .env
php artisan migrate
php artisan db:seed --class=AdminUserSeeder
php artisan serve

# Frontend, in another terminal
cd frontend
npm install
npm run dev
```

The API runs at `http://127.0.0.1:8000`. Vite serves the frontend at `http://127.0.0.1:5173` and proxies `/api` to the backend.

### Default local account

- Email: `admin@gmail.com`
- Password: `dsadsadsa`

The account is created by `AdminUserSeeder` for local development. Change the credentials before deploying Orqiva.

AI provider keys are managed from **API Keys** inside the app; they are encrypted at rest and are never returned to the browser.

## Tests

```sh
cd backend
php artisan test

cd ../frontend
npm run lint
npm run build
```

Backend tests use in-memory SQLite and mock AI providers, so they do not require credentials or touch the local database.

## Documentation

See [`README-SETUP.md`](README-SETUP.md) for detailed setup and operations. In the app, open **Help & Support** for quick start, the node reference, channel setup, troubleshooting, and license information.

## Security

- Keep backend credentials in environment configuration and never commit real secrets.
- Store AI keys through the app so they are encrypted in the database.
- Use HTTPS, restrict CORS, disable debug mode, and change the default admin credentials before production.
- Back up the database and `APP_KEY`; encrypted provider keys cannot be recovered without the same application key.

## License

MIT License. Copyright (c) 2026 Azarya Geraldo. See [`LICENSE`](LICENSE).

Built by **Azarya Geraldo**.
