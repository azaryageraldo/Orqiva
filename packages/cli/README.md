# Orqiva CLI

Install Orqiva as a local application:

```sh
npm install -g orqiva
orqiva
```

The first run opens the browser setup wizard. Create an admin account, add an AI provider key from **API Keys**, and start building workflows. No default account exists.

## Commands

```sh
orqiva                  # start and open the browser
orqiva start --no-open  # start without opening the browser
orqiva status           # show URL and process state
orqiva stop             # stop server and queue worker
orqiva logs --lines 100 # read server and worker logs
orqiva doctor           # check PHP runtime, extensions, data, and port
orqiva backup           # back up SQLite, storage, and runtime config
orqiva restore <folder> --yes
orqiva update --yes
orqiva data             # print the data directory
```

## Data and ports

- Default URL: `http://127.0.0.1:20129`
- Default data directory:
  - Linux: `~/.local/share/orqiva`
  - macOS: `~/Library/Application Support/Orqiva`
  - Windows: `%APPDATA%\Orqiva`
- `ORQIVA_DATA_DIR` overrides the data directory.
- `ORQIVA_PUBLIC_URL=https://cs.example.com` enables a public origin through a reverse proxy or tunnel.
- `ORQIVA_BIND_HOST=0.0.0.0` binds the server to all interfaces. Only do this behind a firewall or reverse proxy.
- `ORQIVA_PHP_BINARY` points to a custom PHP or FrankenPHP binary.

The SQLite database lives at `<data-dir>/data/orqiva.sqlite`. Keep backups and never commit `.env` or the database to Git.

## Runtime

The npm package ships with a FrankenPHP runtime per platform. The server and queue worker run as child processes; press `Ctrl+C` or run `orqiva stop` to stop them.

If `public/app.html` is missing, build the frontend first:

```sh
cd frontend
npm run build:app
```
