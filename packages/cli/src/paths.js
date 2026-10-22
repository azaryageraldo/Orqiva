import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function getDataDir(env = process.env, platform = process.platform) {
  if (env.ORQIVA_DATA_DIR) {
    return resolve(env.ORQIVA_DATA_DIR);
  }

  if (platform === "win32") {
    return join(
      env.APPDATA || join(homedir(), "AppData", "Roaming"),
      "Orqiva",
    );
  }

  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "Orqiva");
  }

  return join(
    env.XDG_DATA_HOME || join(homedir(), ".local", "share"),
    "orqiva",
  );
}

export function resolveAppRoot(env = process.env) {
  const candidates = [
    env.ORQIVA_APP_ROOT,
    join(packageRoot, "app"),
    resolve(packageRoot, "..", "..", "backend"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const root = resolve(candidate);

    if (
      existsSync(join(root, "artisan")) &&
      existsSync(join(root, "public", "index.php"))
    ) {
      return root;
    }
  }

  throw new Error(
    "Runtime Orqiva tidak ditemukan. Set ORQIVA_APP_ROOT ke folder backend.",
  );
}

export function resolvePhpBinary(env = process.env) {
  if (env.ORQIVA_PHP_BINARY) {
    return env.ORQIVA_PHP_BINARY;
  }

  const executable = process.platform === "win32" ? "frankenphp.exe" : "frankenphp";
  const bundled = join(packageRoot, "runtime", "frankenphp", executable);

  if (existsSync(bundled)) {
    return bundled;
  }

  const platformPackage = `orqiva-runtime-${process.platform}-${process.arch}`;

  try {
    const require = createRequire(import.meta.url);
    const manifest = require.resolve(`${platformPackage}/package.json`);
    const packaged = join(dirname(manifest), executable);

    if (existsSync(packaged)) {
      return packaged;
    }
  } catch {
    // Fall back to FrankenPHP on PATH.
  }

  return "frankenphp";
}

export function isFrankenPhp(phpBinary, env = process.env) {
  return (
    env.ORQIVA_FRANKENPHP === "1" ||
    basename(phpBinary).toLowerCase().includes("frankenphp")
  );
}

export function getRuntimePaths(dataDir) {
  return {
    dataDir,
    data: join(dataDir, "data"),
    storage: join(dataDir, "storage"),
    logs: join(dataDir, "logs"),
    backups: join(dataDir, "backups"),
    envFile: join(dataDir, ".env"),
    stateFile: join(dataDir, "runtime.json"),
    serverLog: join(dataDir, "logs", "server.log"),
    workerLog: join(dataDir, "logs", "worker.log"),
    pollerLog: join(dataDir, "logs", "telegram.log"),
    database: join(dataDir, "data", "orqiva.sqlite"),
  };
}

export function ensureDataDirs(dataDir) {
  const paths = getRuntimePaths(dataDir);
  const directories = [
    paths.dataDir,
    paths.data,
    paths.logs,
    paths.backups,
    paths.storage,
    join(paths.storage, "app"),
    join(paths.storage, "app", "public"),
    join(paths.storage, "framework"),
    join(paths.storage, "framework", "cache"),
    join(paths.storage, "framework", "sessions"),
    join(paths.storage, "framework", "views"),
    join(paths.storage, "logs"),
    join(dataDir, "caddy", "data"),
    join(dataDir, "caddy", "config"),
    join(dataDir, "caddy", "cache"),
  ];

  for (const directory of directories) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }

  return paths;
}
