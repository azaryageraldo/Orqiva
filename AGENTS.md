# Repository Guidelines

## Project Structure & Module Organization

The repository has a Phase 1 foundation: `README.md` defines the product requirements, `backend/` contains the Laravel API shell, and `frontend/` contains the React/Vite starter. Workflow persistence and execution are not implemented yet. Keep backend domain code under `backend/app/Services/Workflows/` and `backend/app/Services/AI/`, with tests in `backend/tests/Feature/` and `backend/tests/Unit/`. Organize React code under `frontend/src/` by pages, reusable components, and domain features such as `workflows/`, `workflow-editor/`, and `executions/`.

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

Add Laravel unit tests for workflow validation, graph ordering, branching, and node execution; add feature tests for API validation, CRUD, authorization, execution, and logs. Mock Gemini so tests never require credentials or call the live provider. Test files belong in `backend/tests/Unit/` or `backend/tests/Feature/`. Add frontend tests for important utilities and interactions as a test setup is introduced.

## Security & Configuration

Keep real credentials in backend environment configuration only; commit placeholder values in `.env.example`. Never expose `GEMINI_API_KEY` to the frontend, store secrets in workflow definitions, execute user-provided code, or return internal traces. Validate workflow node types, configuration, edges, and cycles on the server.

## Commits & Pull Requests

There is no usable Git history yet to establish a commit convention. Use short, descriptive imperative subjects (for example, `Add workflow cycle validation`). Pull requests should explain the user-facing or architectural change, list relevant checks and their results, link related issues when available, and include screenshots for UI changes.
