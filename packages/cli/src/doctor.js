import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  ensureDataDirs,
  isFrankenPhp,
  resolveAppRoot,
  resolvePhpBinary,
} from "./paths.js";
import {
  getRuntimeStatus,
  isPortFree,
  readDatabaseOptions,
} from "./runtime.js";

const REQUIRED_EXTENSIONS = [
  "curl",
  "fileinfo",
  "mbstring",
  "openssl",
  "pdo_sqlite",
];

export async function runDoctor({ dataDir, port = 20129 }) {
  const checks = [];
  const paths = ensureDataDirs(dataDir);

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push({
    ok: nodeMajor >= 20,
    label: `Node.js ${process.versions.node}`,
    detail: nodeMajor >= 20 ? "OK" : "Butuh Node.js 20 atau lebih baru",
  });

  let appRoot = null;
  try {
    appRoot = resolveAppRoot();
    checks.push({ ok: true, label: "Runtime aplikasi", detail: appRoot });
  } catch (error) {
    checks.push({ ok: false, label: "Runtime aplikasi", detail: error.message });
  }

  const frontendBuilt = appRoot
    ? existsSync(join(appRoot, "public", "app.html"))
    : false;

  checks.push({
    ok: frontendBuilt,
    label: "Frontend build",
    detail: frontendBuilt
      ? "OK"
      : "Belum ada public/app.html; jalankan build frontend",
  });

  const phpBinary = resolvePhpBinary();
  const phpVersion = spawnSync(phpBinary, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (phpVersion.error || phpVersion.status !== 0) {
    checks.push({
      ok: false,
      label: "Runtime PHP",
      detail: `${phpBinary} tidak dapat dijalankan`,
    });
  } else {
    checks.push({
      ok: true,
      label: "Runtime PHP",
      detail: `${phpVersion.stdout.split(/\r?\n/)[0]} (${isFrankenPhp(phpBinary) ? "FrankenPHP" : "PHP CLI"})`,
    });

    const probe = spawnSync(
      phpBinary,
      [
        ...(isFrankenPhp(phpBinary) ? ["php-cli"] : []),
        "-r",
        "echo json_encode(['version' => PHP_VERSION, 'extensions' => get_loaded_extensions()]);",
      ],
      { encoding: "utf8", windowsHide: true },
    );
    let loaded = [];

    try {
      loaded = JSON.parse(probe.stdout || "{}").extensions || [];
    } catch {
      // The extension check below reports the missing modules.
    }

    const loadedSet = new Set(loaded.map((name) => name.toLowerCase()));
    const missing = REQUIRED_EXTENSIONS.filter(
      (name) => !loadedSet.has(name),
    );

    checks.push({
      ok: missing.length === 0,
      label: "Ekstensi PHP",
      detail:
        missing.length === 0
          ? REQUIRED_EXTENSIONS.join(", ")
          : `Belum tersedia: ${missing.join(", ")}`,
    });
  }

  try {
    const probe = join(paths.dataDir, ".write-test");
    writeFileSync(probe, "ok", { mode: 0o600 });
    rmSync(probe, { force: true });
    accessSync(paths.dataDir, constants.R_OK | constants.W_OK);
    checks.push({ ok: true, label: "Folder data", detail: paths.dataDir });
  } catch {
    checks.push({
      ok: false,
      label: "Folder data",
      detail: `Tidak dapat menulis ke ${paths.dataDir}`,
    });
  }

  const database = readDatabaseOptions(process.env, paths.envFile);

  if (database.connection === "mysql") {
    checks.push({
      ok: true,
      label: "Database MySQL",
      detail: `${database.username || "?"}@${database.host || "127.0.0.1"}:${database.port || "3306"}/${database.database || "?"}`,
    });
  } else {
    checks.push({
      ok: existsSync(paths.database),
      label: "Database SQLite",
      detail: existsSync(paths.database)
        ? paths.database
        : "Akan dibuat saat `orqiva` pertama kali dijalankan",
    });
  }

  const status = await getRuntimeStatus(dataDir);
  checks.push({
    ok: true,
    label: "Status server",
    detail: status.running
      ? `Berjalan di ${status.state.url}${status.healthy ? "" : " (belum sehat)"}`
      : "Belum berjalan",
  });

  if (status.running) {
    checks.push({
      ok: true,
      label: "Port",
      detail: String(status.state.port),
    });
  } else {
    const free = await isPortFree(port);
    checks.push({
      ok: free,
      label: `Port ${port}`,
      detail: free ? "Tersedia" : "Dipakai proses lain; Orqiva akan memilih port berikutnya",
    });
  }

  for (const check of checks) {
    console.log(`${check.ok ? "OK  " : "FAIL"}  ${check.label}: ${check.detail}`);
  }

  const failed = checks.filter((check) => !check.ok);
  console.log("");
  console.log(
    failed.length === 0
      ? "Semua pemeriksaan lulus."
      : `${failed.length} pemeriksaan perlu diperbaiki.`,
  );

  return failed.length === 0;
}
