import {
  cp,
  mkdir,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { ensureDataDirs } from "./paths.js";
import { isProcessAlive, readDatabaseOptions } from "./runtime.js";

export async function backupRuntime(dataDir, label = null) {
  const paths = ensureDataDirs(dataDir);
  assertStopped(paths);

  const database = readDatabaseOptions(process.env, paths.envFile);
  const mysql = database.connection === "mysql";

  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
  const name = label ? `${stamp}-${sanitize(label)}` : stamp;
  const destination = join(paths.backups, `orqiva-${name}`);

  await mkdir(destination, { recursive: true, mode: 0o700 });
  await cp(paths.data, join(destination, "data"), { recursive: true });
  await cp(paths.storage, join(destination, "storage"), { recursive: true });

  if (existsSync(paths.envFile)) {
    await cp(paths.envFile, join(destination, ".env"));
  }

  await writeFile(
    join(destination, "backup.json"),
    `${JSON.stringify(
      {
        app: "orqiva",
        createdAt: new Date().toISOString(),
        source: dataDir,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );

  console.log(`Backup dibuat: ${destination}`);

  if (mysql) {
    console.log(
      "Catatan: mode MySQL tidak mem-backup isi database. Gunakan mysqldump untuk data MySQL.",
    );
  }

  return destination;
}

export async function listBackups(dataDir) {
  const paths = ensureDataDirs(dataDir);
  const entries = await readdir(paths.backups, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("orqiva-"))
    .map((entry) => join(paths.backups, entry.name))
    .sort()
    .reverse();
}

export async function restoreRuntime(dataDir, source) {
  const paths = ensureDataDirs(dataDir);
  assertStopped(paths);

  const backup = resolve(source);
  const database = join(backup, "data", "orqiva.sqlite");
  const envFile = join(backup, ".env");

  if (
    !existsSync(database) ||
    !existsSync(envFile) ||
    !existsSync(join(backup, "storage"))
  ) {
    throw new Error(
      `Backup tidak valid: ${backup}. Folder harus berisi data/orqiva.sqlite, storage, dan .env.`,
    );
  }

  await rm(paths.data, { recursive: true, force: true });
  await rm(paths.storage, { recursive: true, force: true });
  await rm(paths.envFile, { force: true });

  await cp(join(backup, "data"), paths.data, { recursive: true });
  await cp(join(backup, "storage"), paths.storage, { recursive: true });
  await cp(envFile, paths.envFile);

  console.log(`Data Orqiva dipulihkan dari ${backup}`);
}

function assertStopped(paths) {
  if (!existsSync(paths.stateFile)) return;

  try {
    const state = JSON.parse(readFileSync(paths.stateFile, "utf8"));
    if (state?.pid && isProcessAlive(state.pid)) {
      throw new Error("Hentikan Orqiva terlebih dahulu dengan `orqiva stop`.");
    }
  } catch (error) {
    if (error.message.includes("Hentikan Orqiva")) throw error;
  }
}

function sanitize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
