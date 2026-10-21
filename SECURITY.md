# Security Policy

## Supported versions

Security fixes are applied to the latest version on the `main` branch.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories for this repository. Do not disclose the issue publicly until a fix is available.

Include the affected version, reproduction steps, impact, and any suggested mitigation. Avoid including real customer data, API keys, or production credentials.

## Security expectations

- Never commit real provider keys, `APP_KEY` values, session cookies, or production database dumps.
- Keep AI provider keys encrypted at rest and never return them to the browser.
- Change the seeded admin credentials before any non-local deployment.
- Run Orqiva over HTTPS, disable debug mode, and restrict CORS to trusted origins.
- Treat workflow prompts and imported workflow definitions as untrusted input.
