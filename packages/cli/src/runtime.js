import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { basename, join } from "node:path";

import { buildRuntimeEnv, parseEnv } from "./env.js";
import {
  ensureDataDirs,
  getRuntimePaths,
  isFrankenPhp,
  resolveAppRoot,
  resolvePhpBinary,
} from "./paths.js";

const DEFAULT_PORT = 20129;
const PORT_ATTEMPTS = 20;
const HEALTH_TIMEOUT_MS = 45_000;

export async function startRuntime(options = {}) {
  const dataDir = options.dataDir;
  const appRoot = options.appRoot || resolveAppRoot();
  const phpBinary = options.phpBinary || resolvePhpBinary();
  const publicUrl = options.publicUrl || process.env.ORQIVA_PUBLIC_URL || null;
  const bindHost = options.bindHost || process.env.ORQIVA_BIND_HOST || "127.0.0.1";
  const paths = ensureDataDirs(dataDir);

  const running = await readRunningState(paths);
  if (running) {
    console.log(`Orqiva sudah berjalan di ${running.url}`);
    if (options.open !== false) openBrowser(running.url);
    return running;
  }

  checkPhpRuntime(phpBinary);

  const port = options.port
    ? Number(options.port)
    : await findAvailablePort(DEFAULT_PORT, bindHost);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port tidak valid.");
  }

  if (options.port && !(await isPortFree(port, bindHost))) {
    throw new Error(`Port ${port} sedang dipakai. Pilih port lain dengan --port.`);
  }

  const database = readDatabaseOptions(process.env, paths.envFile);
  const { env, config } = buildRuntimeEnv({
    dataDir,
    port,
    phpBinary,
    publicUrl,
    database,
  });

  if (config.connection === "sqlite") {
    ensureDatabaseFile(paths.database);
  }
  runArtisan({
    phpBinary,
    appRoot,
    env,
    args: ["migrate", "--force"],
    logFile: paths.serverLog,
  });

  const url = `http://127.0.0.1:${port}`;
  const server = startChild({
    name: "server",
    command: phpBinary,
    args: isFrankenPhp(phpBinary)
      ? [
          "php-server",
          "--listen",
          `${bindHost}:${port}`,
          "--root",
          join(appRoot, "public"),
        ]
      : ["artisan", "serve", `--host=${bindHost}`, `--port=${port}`],
    cwd: appRoot,
    env,
    logFile: paths.serverLog,
  });

  const worker = startChild({
    name: "worker",
    command: phpBinary,
    args: [
      ...artisanPrefix(phpBinary),
      "queue:work",
      "--sleep=1",
      "--tries=1",
      "--timeout=240",
      "--max-time=3600",
    ],
    cwd: appRoot,
    env,
    logFile: paths.workerLog,
  });

  const poller = startChild({
    name: "telegram",
    command: phpBinary,
    args: [...artisanPrefix(phpBinary), "channels:telegram-poll"],
    cwd: appRoot,
    env,
    logFile: paths.pollerLog,
  });

  const state = {
    pid: process.pid,
    serverPid: server.child.pid,
    workerPid: worker.child.pid,
    pollerPid: poller.child.pid,
    port,
    url,
    appRoot,
    dataDir,
    publicUrl: publicUrl || null,
    startedAt: new Date().toISOString(),
  };

  writeFileSync(paths.stateFile, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });

  let shuttingDown = false;
  let workerRestartTimer = null;
  let pollerRestartTimer = null;

  const shutdown = (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;

    if (workerRestartTimer) clearTimeout(workerRestartTimer);
    if (pollerRestartTimer) clearTimeout(pollerRestartTimer);

    terminateChild(server.child);
    terminateChild(worker.child);
    terminateChild(poller.child);

    try {
      rmSync(paths.stateFile, { force: true });
    } catch {
      // State cleanup is best-effort.
    }

    const timeout = setTimeout(() => process.exit(exitCode), 1500);
    timeout.unref();
  };

  process.once("SIGINT", () => shutdown(0));
  process.once("SIGTERM", () => shutdown(0));

  server.child.once("exit", (code) => {
    if (!shuttingDown) {
      console.error(
        `Server Orqiva berhenti (exit ${code ?? "unknown"}). Lihat ${paths.serverLog}`,
      );
      shutdown(1);
    }
  });

  worker.child.once("exit", (code) => {
    if (shuttingDown) return;

    appendFileSync(
      paths.workerLog,
      `[${new Date().toISOString()}] worker exited with code ${code ?? "unknown"}; restarting\n`,
    );

    workerRestartTimer = setTimeout(() => {
      if (!shuttingDown) {
        restartWorker();
      }
    }, 2000);
    workerRestartTimer.unref();
  });

  poller.child.once("exit", (code) => {
    if (shuttingDown) return;

    appendFileSync(
      paths.pollerLog,
      `[${new Date().toISOString()}] telegram poller exited with code ${code ?? "unknown"}; restarting\n`,
    );

    pollerRestartTimer = setTimeout(() => {
      if (!shuttingDown) {
        restartPoller();
      }
    }, 5000);
    pollerRestartTimer.unref();
  });

  function restartPoller() {
    const next = startChild({
      name: "telegram",
      command: phpBinary,
      args: [...artisanPrefix(phpBinary), "channels:telegram-poll"],
      cwd: appRoot,
      env,
      logFile: paths.pollerLog,
    });

    state.pollerPid = next.child.pid;
    next.child.once("exit", (code) => {
      if (shuttingDown) return;
      appendFileSync(
        paths.pollerLog,
        `[${new Date().toISOString()}] telegram poller exited with code ${code ?? "unknown"}; restarting\n`,
      );
      pollerRestartTimer = setTimeout(restartPoller, 5000);
      pollerRestartTimer.unref();
    });
  }

  function restartWorker() {
    const next = startChild({
      name: "worker",
      command: phpBinary,
      args: [
        ...artisanPrefix(phpBinary),
        "queue:work",
        "--sleep=1",
        "--tries=1",
        "--timeout=240",
        "--max-time=3600",
      ],
      cwd: appRoot,
      env,
      logFile: paths.workerLog,
    });

    state.workerPid = next.child.pid;
    next.child.once("exit", (code) => {
      if (shuttingDown) return;
      appendFileSync(
        paths.workerLog,
        `[${new Date().toISOString()}] worker exited with code ${code ?? "unknown"}; restarting\n`,
      );
      workerRestartTimer = setTimeout(restartWorker, 2000);
      workerRestartTimer.unref();
    });
  }

  const healthy = await waitForHealth(url, HEALTH_TIMEOUT_MS);

  if (!healthy) {
    console.error("Orqiva gagal mulai. Log terakhir:");
    printLogTail(paths.serverLog);
    printLogTail(paths.workerLog);
    printLogTail(paths.pollerLog);
    shutdown(1);
    throw new Error("Server tidak merespons health check.");
  }

  console.log("");
  console.log(`Orqiva berjalan di ${url}`);
  console.log(`Data: ${dataDir}`);
  console.log("Tekan Ctrl+C untuk menghentikan Orqiva.");

  if (options.open !== false) {
    openBrowser(url);
  }

  await new Promise((resolve) => {
    process.once("exit", resolve);
  });
}

export async function stopRuntime(dataDir) {
  const paths = getRuntimePaths(dataDir);
  const state = readState(paths.stateFile);

  if (!state?.pid) {
    console.log("Orqiva tidak sedang berjalan.");
    return false;
  }

  if (!isProcessAlive(state.pid)) {
    rmSync(paths.stateFile, { force: true });
    console.log("Orqiva tidak sedang berjalan (state lama dibersihkan).");
    return false;
  }

  process.kill(state.pid, "SIGTERM");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(150);

    if (!isProcessAlive(state.pid)) {
      rmSync(paths.stateFile, { force: true });
      console.log("Orqiva dihentikan.");
      return true;
    }
  }

  process.kill(state.pid, "SIGKILL");
  rmSync(paths.stateFile, { force: true });
  console.log("Orqiva dihentikan paksa.");
  return true;
}

export async function getRuntimeStatus(dataDir) {
  const paths = getRuntimePaths(dataDir);
  const state = readState(paths.stateFile);

  if (!state?.pid || !isProcessAlive(state.pid)) {
    return { running: false, state: null, healthy: false };
  }

  const healthy = await waitForHealth(state.url, 1500);

  return { running: true, state, healthy };
}

export function checkPhpRuntime(phpBinary) {
  const result = spawnSync(phpBinary, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      `Runtime PHP tidak ditemukan (${phpBinary}). Jalankan \`orqiva doctor\` atau set ORQIVA_PHP_BINARY.`,
    );
  }

  return result.stdout.split(/\r?\n/)[0] || phpBinary;
}

export function runArtisan({ phpBinary, appRoot, env, args, logFile }) {
  const result = spawnSync(phpBinary, [...artisanPrefix(phpBinary), ...args], {
    cwd: appRoot,
    env,
    encoding: "utf8",
    windowsHide: true,
  });

  if (logFile) {
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    if (output.trim()) {
      appendFileSync(logFile, `[artisan ${args.join(" ")}]\n${output}\n`);
    }
  }

  if (result.error) {
    throw new Error(`Gagal menjalankan PHP: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `Artisan ${args.join(" ")} gagal: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }

  return result.stdout;
}

export async function findAvailablePort(start = DEFAULT_PORT, host = "127.0.0.1") {
  for (let offset = 0; offset < PORT_ATTEMPTS; offset += 1) {
    const port = start + offset;
    if (await isPortFree(port, host)) return port;
  }

  throw new Error(
    `Tidak ada port kosong dari ${start} sampai ${start + PORT_ATTEMPTS - 1}.`,
  );
}

export function isPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

export async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/up`, {
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) return true;
    } catch {
      // The server is still starting.
    }

    await sleep(350);
  }

  return false;
}

export function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  child.on("error", () => {
    console.log(`Buka browser secara manual: ${url}`);
  });
  child.unref();
}

export function readDatabaseOptions(env = process.env, envFile = null) {
  const fileValues =
    envFile && existsSync(envFile)
      ? parseEnv(readFileSync(envFile, "utf8"))
      : {};

  const pick = (...keys) => {
    for (const key of keys) {
      if (env[key]) return env[key];
      if (fileValues[key]) return fileValues[key];
    }

    return undefined;
  };

  if (pick("ORQIVA_DB_CONNECTION", "DB_CONNECTION") !== "mysql") {
    return { connection: "sqlite" };
  }

  return {
    connection: "mysql",
    host: pick("ORQIVA_DB_HOST", "DB_HOST") || "127.0.0.1",
    port: pick("ORQIVA_DB_PORT", "DB_PORT") || "3306",
    database: pick("ORQIVA_DB_DATABASE", "DB_DATABASE"),
    username: pick("ORQIVA_DB_USERNAME", "DB_USERNAME"),
    password: pick("ORQIVA_DB_PASSWORD", "DB_PASSWORD") || "",
  };
}

function artisanPrefix(phpBinary) {
  return isFrankenPhp(phpBinary) ? ["php-cli", "artisan"] : ["artisan"];
}

export function printLogTail(file, lines = 40) {
  if (!existsSync(file)) return;

  const content = readFileSync(file, "utf8").trimEnd().split(/\r?\n/);
  console.error(content.slice(-lines).join("\n"));
}

export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function startChild({ command, args, cwd, env, logFile }) {
  const logFd = openSync(logFile, "a", 0o600);
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });

  closeSync(logFd);

  child.once("error", (error) => {
    appendFileSync(
      logFile,
      `[${new Date().toISOString()}] failed to start ${basename(command)}: ${error.message}\n`,
    );
  });

  return { child };
}

function terminateChild(child) {
  if (!child || child.killed) return;

  try {
    child.kill("SIGTERM");
  } catch {
    // The child may already be gone.
  }

  const timeout = setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      // The child may already be gone.
    }
  }, 1000);
  timeout.unref();
}

function ensureDatabaseFile(databasePath) {
  const descriptor = openSync(databasePath, "a", 0o600);
  closeSync(descriptor);
}

function readState(stateFile) {
  if (!existsSync(stateFile)) return null;

  try {
    return JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    return null;
  }
}

async function readRunningState(paths) {
  const state = readState(paths.stateFile);
  if (!state?.pid || !state.url) return null;
  if (!isProcessAlive(state.pid)) {
    rmSync(paths.stateFile, { force: true });
    return null;
  }

  const healthy = await waitForHealth(state.url, 1500);
  return healthy ? state : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
