import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readDatabaseOptions } from "../src/runtime.js";

test("defaults to sqlite without configuration", () => {
  assert.deepEqual(readDatabaseOptions({}), { connection: "sqlite" });
});

test("reads mysql options from the environment", () => {
  const options = readDatabaseOptions({
    ORQIVA_DB_CONNECTION: "mysql",
    ORQIVA_DB_HOST: "127.0.0.1",
    ORQIVA_DB_DATABASE: "orqiva",
    ORQIVA_DB_USERNAME: "root",
  });

  assert.equal(options.connection, "mysql");
  assert.equal(options.database, "orqiva");
  assert.equal(options.username, "root");
  assert.equal(options.port, "3306");
});

test("falls back to the existing env file", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "orqiva-runtime-"));
  const envFile = join(dataDir, ".env");

  try {
    writeFileSync(
      envFile,
      "DB_CONNECTION=mysql\nDB_HOST=db\nDB_DATABASE=orqiva\nDB_USERNAME=user\nDB_PASSWORD=pass\n",
    );

    const options = readDatabaseOptions({}, envFile);

    assert.equal(options.connection, "mysql");
    assert.equal(options.host, "db");
    assert.equal(options.password, "pass");
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
