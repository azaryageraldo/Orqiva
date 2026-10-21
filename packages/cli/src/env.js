import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ensureDataDirs } from "./paths.js";

export function generateAppKey() {
  return `base64:${randomBytes(32).toString("base64")}`;
}

export function parseEnv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function envValue(value) {
  const text = String(value);

  if (/[\s#"']/.test(text)) {
    return `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
  }

  return text;
}

function sqlitePath(paths) {
  return paths.database.replaceAll("\\", "/");
}

export function ensureEnvFile({
  dataDir,
  port,
  publicUrl = null,
  database = {},
}) {
  const paths = ensureDataDirs(dataDir);
  const localOrigin = `http://127.0.0.1:${port}`;
  const publicOrigin = publicUrl ? normalizePublicUrl(publicUrl) : null;
  const appUrl = publicOrigin || localOrigin;
  const existing = existsSync(paths.envFile)
    ? parseEnv(readFileSync(paths.envFile, "utf8"))
    : {};
  const appKey = existing.APP_KEY || generateAppKey();
  const connection = database.connection === "mysql" ? "mysql" : "sqlite";

  const databaseLines =
    connection === "mysql"
      ? [
          "DB_CONNECTION=mysql",
          `DB_HOST=${envValue(database.host || "127.0.0.1")}`,
          `DB_PORT=${envValue(database.port || "3306")}`,
          `DB_DATABASE=${envValue(required(database.database, "DB_DATABASE"))}`,
          `DB_USERNAME=${envValue(required(database.username, "DB_USERNAME"))}`,
          `DB_PASSWORD=${envValue(database.password || "")}`,
        ]
      : ["DB_CONNECTION=sqlite", `DB_DATABASE=${envValue(sqlitePath(paths))}`];

  const content = [
    "APP_NAME=Orqiva",
    "APP_ENV=production",
    `APP_KEY=${envValue(appKey)}`,
    "APP_DEBUG=false",
    `APP_URL=${envValue(appUrl)}`,
    "APP_MAINTENANCE_DRIVER=file",
    "LOG_CHANNEL=stack",
    "LOG_LEVEL=warning",
    "",
    ...databaseLines,
    "",
    "SESSION_DRIVER=database",
    "SESSION_LIFETIME=120",
    "SESSION_ENCRYPT=false",
    `SESSION_SECURE_COOKIE=${publicOrigin ? "true" : "false"}`,
    "SESSION_SAME_SITE=lax",
    "CACHE_STORE=file",
    "QUEUE_CONNECTION=database",
    "QUEUE_WORKER_SLEEP=1",
    "",
    `SANCTUM_STATEFUL_DOMAINS=${envValue(statefulDomains(port, publicOrigin))}`,
    `CORS_ALLOWED_ORIGINS=${envValue(corsOrigins(port, publicOrigin))}`,
    "",
    "GEMINI_TIMEOUT=30",
    "OPENAI_BASE_URL=https://api.openai.com/v1",
    "OPENROUTER_BASE_URL=https://openrouter.ai/api/v1",
    "",
  ].join("\n");

  writeFileSync(paths.envFile, content, { mode: 0o600 });

  return {
    paths,
    appKey,
    appUrl,
    publicOrigin,
    localOrigin,
    connection,
    statefulDomains: statefulDomains(port, publicOrigin),
    corsOrigins: corsOrigins(port, publicOrigin),
  };
}

export function buildRuntimeEnv({
  dataDir,
  port,
  phpBinary,
  publicUrl = null,
  database = {},
  baseEnv = process.env,
}) {
  const config = ensureEnvFile({ dataDir, port, publicUrl, database });
  const localHost = `127.0.0.1:${port}`;
  const env = {
    ...baseEnv,
    APP_ENV: "production",
    APP_DEBUG: "false",
    APP_KEY: config.appKey,
    APP_URL: config.appUrl,
    APP_MAINTENANCE_DRIVER: "file",
    LOG_CHANNEL: "stack",
    LOG_LEVEL: "warning",
    DB_CONNECTION: config.connection,
    DB_DATABASE:
      config.connection === "mysql" ? database.database : config.paths.database,
    SESSION_DRIVER: "database",
    SESSION_SECURE_COOKIE: config.publicOrigin ? "true" : "false",
    SESSION_SAME_SITE: "lax",
    CACHE_STORE: "file",
    QUEUE_CONNECTION: "database",
    QUEUE_WORKER_SLEEP: "1",
    SANCTUM_STATEFUL_DOMAINS: config.statefulDomains,
    CORS_ALLOWED_ORIGINS: config.corsOrigins,
    ORQIVA_DATA_DIR: dataDir,
    ORQIVA_HOST: localHost,
    ORQIVA_PHP_BINARY: phpBinary,
    XDG_DATA_HOME: join(dataDir, "caddy", "data"),
    XDG_CONFIG_HOME: join(dataDir, "caddy", "config"),
    XDG_CACHE_HOME: join(dataDir, "caddy", "cache"),
  };

  return { env, config };
}

export function normalizePublicUrl(value) {
  const url = new URL(value);

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      "ORQIVA_PUBLIC_URL harus berupa origin tanpa path, misalnya https://cs.example.com.",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("ORQIVA_PUBLIC_URL harus memakai http:// atau https://.");
  }

  return url.origin;
}

function statefulDomains(port, publicOrigin) {
  const domains = new Set([
    "127.0.0.1",
    "localhost",
    `127.0.0.1:${port}`,
    `localhost:${port}`,
  ]);

  if (publicOrigin) {
    domains.add(new URL(publicOrigin).host);
  }

  return [...domains].join(",");
}

function corsOrigins(port, publicOrigin) {
  const origins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ]);

  if (publicOrigin) {
    origins.add(publicOrigin);
  }

  return [...origins].join(",");
}

export function logPathHint(dataDir) {
  return join(dataDir, "logs", "server.log");
}

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Mode MySQL membutuhkan ${name}. Set variabel lingkungan sebelum menjalankan Orqiva.`,
    );
  }

  return value.trim();
}
