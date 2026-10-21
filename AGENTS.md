# Repository Guidelines

## Project Structure & Module Organization

The repository contains a working MVP: `README.md` defines the product requirements, `backend/` contains the Laravel API (Sanctum session auth, workflow CRUD with per-user ownership, execution engine, Gemini integration, usage stats), and `frontend/` contains the React/Vite app (dashboard, workflow list with pagination, visual editor, chat tester). Workflow validation lives in `backend/app/Services/Workflows/`; keep future domain code there and in `backend/app/Services/AI/`, with tests in `backend/tests/Feature/` and `backend/tests/Unit/`. Organize React code under `frontend/src/` by pages, reusable components, and domain features such as `workflows/`, `workflow-editor/`, and `executions/`. The `packages/cli/` npm package (`orqiva`) runs the app as a local service with a bundled FrankenPHP runtime, per-platform `orqiva-runtime-*` packages, and shared data under `ORQIVA_DATA_DIR`; keep runtime and packaging scripts there.

## Build, Test, and Development Commands

Install instructions are in `README-SETUP.md`. Dependencies are not vendored; run backend commands from `backend/` and frontend commands from `frontend/` after installing them:

- `php artisan serve` starts the Laravel API locally.
- `php artisan test` runs Laravel unit and feature tests once tests are added.
- `npm run dev` starts the Vite development server.
- `npm run build` type-checks and creates a production frontend build.

Check each package's scripts before relying on a command; do not report checks as passing unless they were run.

## Coding Style & Naming

Follow PSR-12 and Laravel conventions in PHP, and strict TypeScript in React. Use `PascalCase` for PHP classes and React components/types, `camelCase` for methods and variables, and `snake_case` for database tables and columns. Use stable workflow node identifiers such as `ai.agent`; keep display labels separate. Prefer small controllers, focused services and node executors, typed API contracts, and centralized API error handling. Avoid `any`, unnecessary dependencies, premature abstractions, and unrelated edits.

## Testing Guidelines

Add Laravel unit tests for workflow validation, graph ordering, branching, and node execution; add feature tests for API validation, CRUD, authorization, execution, and logs. Mock Gemini so tests never require credentials or call the live provider. Test files belong in `backend/tests/Unit/` or `backend/tests/Feature/`. The suite runs against in-memory SQLite (configured in `phpunit.xml`), so `php artisan test` never touches the local MySQL data. Add frontend tests for important utilities and interactions as a test setup is introduced.

## Security & Configuration

Keep server credentials in backend environment configuration and user BYOK keys encrypted at rest in the database; never commit real credentials. Never expose API keys to the frontend, store secrets in workflow definitions, execute user-provided code, or return internal traces. Validate workflow node types, configuration, edges, and cycles on the server.

## Commits & Pull Requests

There is no usable Git history yet to establish a commit convention. Use short, descriptive imperative subjects (for example, `Add workflow cycle validation`). Pull requests should explain the user-facing or architectural change, list relevant checks and their results, link related issues when available, and include screenshots for UI changes.
