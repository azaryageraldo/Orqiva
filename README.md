# Orqiva

**Connect Intelligence. Automate Everything.**

Orqiva is an open-source, self-hostable AI customer service automation workspace. Build visual workflows, connect an AI agent, publish a website chat widget, and manage conversations from a single inbox.

## Features

- Visual workflow editor with stable node IDs, validation, branching, and cross-workflow routing
- BYOK AI providers: Google Gemini, OpenAI, and OpenRouter with encrypted per-user API keys
- Resumable workflow execution with per-step audit logs and checkpoint recovery
- Public website chat widget with embeddable snippet
- Telegram bot channel that receives messages through long polling
- Human handoff and shared inbox for taking over AI conversations
- Usage statistics, token tracking, and execution history
- Dark and light themes with English and Indonesian interfaces

## Technology

- Backend: PHP 8.3+, Laravel 13, Sanctum, MySQL 8 or SQLite
- Frontend: React 19, TypeScript, Vite, React Flow, Tailwind CSS
- AI: Google Gemini, OpenAI, or OpenRouter using your own API key

## Quick start

Install as a local app (once published to npm):

```sh
npm install -g orqiva
orqiva
```

The `orqiva` command starts the bundled FrankenPHP runtime with SQLite, runs migrations, starts a queue worker and the Telegram poller, and opens the browser setup wizard.

From source, requirements are PHP 8.3+, Composer, and Node.js/npm. SQLite is the default database; MySQL 8 is optional.

```sh
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve

# Frontend, in another terminal
cd frontend
npm install
npm run dev
```

The API runs at `http://127.0.0.1:8000`. Vite serves the frontend at `http://127.0.0.1:5173` and proxies `/api` to the backend.

### First account

Open the frontend and complete the setup form. Orqiva creates the first admin account locally; there is no default email or password. To create an account non-interactively, set `ORQIVA_ADMIN_EMAIL` and `ORQIVA_ADMIN_PASSWORD` and run `php artisan db:seed --class=AdminUserSeeder`.

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
- Use HTTPS, restrict CORS, disable debug mode, and complete the first-run setup with a strong account before production. There is no default account.
- Back up the database and `APP_KEY`; encrypted provider keys cannot be recovered without the same application key.

## License

MIT License. Copyright (c) 2026 Azarya Geraldo. See [`LICENSE`](LICENSE).

Built by **Azarya Geraldo**.
