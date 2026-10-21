import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  ensureDataDirs,
  getDataDir,
  getRuntimePaths,
} from "../src/paths.js";
import { compareVersions } from "../src/update.js";

test("honors ORQIVA_DATA_DIR", () => {
  assert.equal(
    getDataDir({ ORQIVA_DATA_DIR: "/tmp/custom-orqiva" }, "linux"),
    resolve("/tmp/custom-orqiva"),
  );
});

test("uses XDG data home on Linux", () => {
  assert.equal(
    getDataDir({ XDG_DATA_HOME: "/tmp/xdg" }, "linux"),
    resolve("/tmp/xdg", "orqiva"),
  );
});

test("creates private runtime directories", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "orqiva-paths-"));

  try {
    const paths = ensureDataDirs(dataDir);

    assert.equal(paths.database, join(dataDir, "data", "orqiva.sqlite"));
    assert.equal(statSync(paths.data).isDirectory(), true);
    assert.equal(statSync(paths.logs).isDirectory(), true);
    assert.equal(statSync(paths.storage).isDirectory(), true);
    assert.equal(statSync(paths.backups).isDirectory(), true);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test("returns stable runtime file paths", () => {
  const paths = getRuntimePaths("/tmp/orqiva-test");

  assert.equal(paths.envFile, "/tmp/orqiva-test/.env");
  assert.equal(paths.stateFile, "/tmp/orqiva-test/runtime.json");
  assert.equal(paths.serverLog, "/tmp/orqiva-test/logs/server.log");
});

test("compares semantic versions", () => {
  assert.ok(compareVersions("0.3.0", "0.2.9") > 0);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.ok(compareVersions("v1.2.0", "1.1.9") > 0);
});
