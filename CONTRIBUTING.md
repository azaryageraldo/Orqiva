# Contributing to Orqiva

Thanks for helping improve Orqiva. Please keep changes focused and include tests for behavior changes.

## Development setup

Follow [`README-SETUP.md`](README-SETUP.md). Run the backend from `backend/` and the frontend from `frontend/`.

## Before opening a pull request

- Add or update backend tests for workflow validation, execution, authorization, or API changes.
- Keep secrets and real API keys out of code, fixtures, workflow definitions, screenshots, and commit history.
- Run the backend test suite:
  ```sh
  cd backend
  php artisan test
  ```
- Run the frontend checks:
  ```sh
  cd frontend
  npm run lint
  npm run build
  ```
- Describe the user-facing change, list checks you ran, and include screenshots for UI changes.

## Code style

Follow PSR-12 and Laravel conventions in PHP. Use strict TypeScript and the existing React patterns. Keep controllers small, put domain logic in services or node executors, and avoid unrelated formatting changes.

## Security reports

Do not open a public issue for a vulnerability. Follow [`SECURITY.md`](SECURITY.md).
