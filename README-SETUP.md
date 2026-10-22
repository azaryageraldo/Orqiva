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

The default database is SQLite at `backend/database/database.sqlite`. Set `DB_CONNECTION=mysql` and the other `DB_*` values in `backend/.env` for a MySQL setup. AI provider keys are not required in `.env`; add them from **API Keys** after signing in.

## Prepare the database

```sh
cd backend
php artisan migrate
```

Open the frontend and complete the setup form to create the first admin account. There is no default email or password and no public registration after setup. To create the account non-interactively, set `ORQIVA_ADMIN_EMAIL` and `ORQIVA_ADMIN_PASSWORD`, then run `php artisan db:seed --class=AdminUserSeeder`.

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

Run a queue worker in a third terminal so widget replies are processed in the background:

```sh
cd backend
php artisan queue:work --sleep=1 --tries=2 --timeout=240
```

### Telegram bot

Connect a Telegram bot from **Channel → Telegram**:

1. Create a bot with [@BotFather](https://t.me/BotFather) using `/newbot`, then copy its token.
2. Paste the token, choose an entry workflow, and enable the channel.
3. Keep the poller running. `orqiva start` launches it automatically (log: `telegram.log` in the Orqiva data directory, or run `orqiva logs`). When running from source, start it with `php artisan channels:telegram-poll` (add `--once` to poll a single batch).

The bot receives updates with long polling, so no public URL or HTTPS certificate is required. Orqiva removes any existing webhook when the token is saved; do not enable a webhook for the same bot elsewhere or polling stops. Incoming messages appear in **Inbox** and replies are sent back through the bot. Only one Telegram bot can be connected per account.

The frontend runs at `http://127.0.0.1:5173` and proxies `/api` to `http://127.0.0.1:8000`. Health endpoints: `GET /up` and `GET /api/v1/health`. Messages are queued in the `jobs` table (`QUEUE_CONNECTION=database`); the widget shows a typing indicator while a job is pending or processing.

For a production build:

```sh
cd frontend
npm run build
```

## Main areas

- **Dashboard** — workflow and execution summary
- **Workflows** — create, validate, and edit visual workflows
- **Inbox** — take over conversations and hand them back to AI
- **Channel** — configure the website widget and connect a Telegram bot
- **Audit Log** — inspect execution steps, tokens, variables, and errors
- **API Keys** — connect Gemini, OpenAI, or OpenRouter with encrypted BYOK keys
- **Settings** — account, language, theme, service status, and help
- **Help & Support** — quick start, all seven nodes with schema examples, variables, channels, inbox, audit, security, and license

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

## Install as a local app (npm CLI)

The `packages/cli` npm package (`orqiva`) runs the app as a local service with a bundled FrankenPHP runtime, SQLite storage, migrations, and a queue worker:

```sh
npm install -g orqiva
orqiva
```

The first run opens the browser setup wizard and creates the first admin account. Data lives in the Orqiva data directory (`orqiva data` prints it). Useful commands: `orqiva status`, `orqiva stop`, `orqiva logs`, `orqiva doctor`, `orqiva backup`, `orqiva update`.

- `ORQIVA_DATA_DIR` moves the data directory.
- `ORQIVA_PUBLIC_URL=https://cs.example.com` sets the public origin used for links, CORS, and Sanctum sessions.
- `ORQIVA_BIND_HOST=0.0.0.0` binds to all interfaces behind a reverse proxy or firewall.
- Published npm packages: `orqiva` plus the matching `orqiva-runtime-*` optional dependency.

### Verify the install

```sh
orqiva doctor
```

`orqiva doctor` checks the bundled runtime, the PHP extensions, the data directory, and the port. A fresh install reports `1 pemeriksaan perlu diperbaiki` because the SQLite database is created during the first run.

### Unsigned runtime notices

The bundled FrankenPHP runtime ships without a code signature:

- macOS may show "cannot be opened because the developer cannot be verified". Open **System Settings → Privacy & Security** and confirm **Open Anyway**, or clear the flag with `xattr -dr com.apple.quarantine "$(npm root -g)/orqiva-runtime-darwin-arm64"`.
- Windows SmartScreen may warn that the app is unrecognized because the CLI is not signed. Choose **More info → Run anyway**, or clear the mark with `Unblock-File (Get-ChildItem "$env:APPDATA\npm\node_modules\orqiva-runtime-win32-x64" -Recurse)`.

### Publish a release

1. Create a granular access token on npm with **Read and write (publish and stage)** and **Bypass two-factor authentication**, then store it as the `NPM_TOKEN` repository secret.
2. Bump the version in `packages/cli/package.json` and keep the `optionalDependencies` versions in sync.
3. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. The `Release` workflow publishes the runtime packages and the CLI, runs a smoke test on Linux, macOS, and Windows, then creates the GitHub release.

The workflow is idempotent: re-running a tag skips packages that are already published.

## Server mode (MySQL + public URL)

Run MySQL from the repository root:

```sh
docker compose up -d mysql
```

Point the CLI at MySQL and a public origin, then start it behind a reverse proxy or a tunnel such as Cloudflare Tunnel:

```sh
export ORQIVA_DB_CONNECTION=mysql
export ORQIVA_DB_HOST=127.0.0.1
export ORQIVA_DB_PORT=3306
export ORQIVA_DB_DATABASE=orqiva
export ORQIVA_DB_USERNAME=orqiva
export ORQIVA_DB_PASSWORD=change-me
export ORQIVA_PUBLIC_URL=https://cs.example.com
export ORQIVA_BIND_HOST=127.0.0.1

orqiva
```

The proxy must forward the public host and HTTPS scheme to `http://127.0.0.1:20129`. Set `ORQIVA_BIND_HOST=0.0.0.0` only when the port is protected by a firewall or a reverse proxy. In MySQL mode, `orqiva backup` only copies `.env` and storage; export the database with `mysqldump`.

## Production checklist

- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Use a strong `APP_KEY` and back it up securely.
- Complete the first-run setup wizard; do not reuse a demo account.
- Serve the app over HTTPS and set `ORQIVA_PUBLIC_URL` (or `CORS_ALLOWED_ORIGINS`) to trusted origins.
- Use a production database and supervised queue workers with a process monitor so widget replies keep flowing after worker restarts.
- Back up the database and `ORQIVA_DATA_DIR` regularly.

## License

MIT License. Copyright (c) 2026 Azarya Geraldo.
