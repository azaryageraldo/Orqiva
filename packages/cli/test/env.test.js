import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildRuntimeEnv,
  ensureEnvFile,
  generateAppKey,
  normalizePublicUrl,
  parseEnv,
} from "../src/env.js";

test("generates a Laravel-compatible app key", () => {
  const key = generateAppKey();

  assert.match(key, /^base64:[A-Za-z0-9+/]+=*$/);
  assert.equal(Buffer.from(key.slice(7), "base64").length, 32);
});

test("parses quoted and plain env values", () => {
  const values = parseEnv(`
APP_NAME=Orqiva
QUOTED="hello world"
SINGLE='one value'
EMPTY=
# COMMENT=ignored
`);

  assert.equal(values.APP_NAME, "Orqiva");
  assert.equal(values.QUOTED, "hello world");
  assert.equal(values.SINGLE, "one value");
  assert.equal(values.EMPTY, "");
  assert.equal(values.COMMENT, undefined);
});

test("normalizes a public origin and rejects paths", () => {
  assert.equal(normalizePublicUrl("https://cs.example.com/"), "https://cs.example.com");
  assert.throws(() => normalizePublicUrl("https://example.com/app"));
  assert.throws(() => normalizePublicUrl("ftp://example.com"));
});

test("creates a production env file with sqlite and setup origins", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "orqiva-env-"));
  const port = 20129;

  try {
    const config = ensureEnvFile({ dataDir, port });
    const content = readFileSync(join(dataDir, ".env"), "utf8");
    const values = parseEnv(content);

    assert.equal(values.APP_ENV, "production");
    assert.equal(values.DB_CONNECTION, "sqlite");
    assert.equal(values.QUEUE_CONNECTION, "database");
    assert.equal(values.APP_URL, `http://127.0.0.1:${port}`);
    assert.ok(values.SANCTUM_STATEFUL_DOMAINS.includes(`127.0.0.1:${port}`));
    assert.equal(values.DB_DATABASE, join(dataDir, "data", "orqiva.sqlite").replaceAll("\\", "/"));
    assert.equal(config.appKey, values.APP_KEY);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test("keeps the same app key across restarts", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "orqiva-env-"));

  try {
    const first = ensureEnvFile({ dataDir, port: 20129 });
    const second = ensureEnvFile({ dataDir, port: 20130 });

    assert.equal(second.appKey, first.appKey);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test("writes mysql configuration when requested", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "orqiva-env-"));

  try {
    ensureEnvFile({
      dataDir,
      port: 20129,
      database: {
        connection: "mysql",
        host: "db.local",
        port: "3307",
        database: "orqiva",
        username: "orqiva",
        password: "secret",
      },
    });

    const values = parseEnv(readFileSync(join(dataDir, ".env"), "utf8"));

    assert.equal(values.DB_CONNECTION, "mysql");
    assert.equal(values.DB_HOST, "db.local");
    assert.equal(values.DB_DATABASE, "orqiva");
    assert.equal(values.DB_USERNAME, "orqiva");
    assert.equal(values.DB_PASSWORD, "secret");
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test("adds the public origin to runtime state and secure cookies", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "orqiva-env-"));
  const { env, config } = buildRuntimeEnv({
    dataDir,
    port: 20129,
    phpBinary: "php",
    publicUrl: "https://cs.example.com",
    baseEnv: { PATH: process.env.PATH },
  });

  try {
    assert.equal(config.publicOrigin, "https://cs.example.com");
    assert.equal(env.APP_URL, "https://cs.example.com");
    assert.equal(env.SESSION_SECURE_COOKIE, "true");
    assert.match(env.SANCTUM_STATEFUL_DOMAINS, /cs\.example\.com/);
    assert.match(env.CORS_ALLOWED_ORIGINS, /https:\/\/cs\.example\.com/);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
