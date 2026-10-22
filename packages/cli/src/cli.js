import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

import { backupRuntime, listBackups, restoreRuntime } from "./backup.js";
import { runDoctor } from "./doctor.js";
import { normalizePublicUrl } from "./env.js";
import { getDataDir, getRuntimePaths } from "./paths.js";
import {
  getRuntimeStatus,
  printLogTail,
  startRuntime,
  stopRuntime,
} from "./runtime.js";
import { currentVersion, updateCli } from "./update.js";

const HELP = `
Orqiva ${currentVersion()}

Pemakaian:
  orqiva [start] [opsi]        Jalankan Orqiva dan buka browser
  orqiva stop                  Hentikan server yang sedang berjalan
  orqiva status                Tampilkan status server
  orqiva doctor                Periksa runtime, data, dan port
  orqiva logs [--lines N]      Tampilkan log server dan worker
  orqiva backup [--label N]    Backup database dan storage
  orqiva restore <folder>      Pulihkan backup (butuh --yes)
  orqiva update [--yes]        Periksa atau pasang versi terbaru
  orqiva data                  Tampilkan lokasi data Orqiva
  orqiva help                  Tampilkan bantuan ini

Opsi start:
  -p, --port <port>            Port lokal (default 20129, otomatis jika dipakai)
      --host <host>            Alamat bind (default 127.0.0.1)
      --public-url <url>       Origin publik, misalnya https://cs.example.com
      --no-open                Jangan buka browser otomatis
      --data-dir <path>        Ganti folder data

Variabel lingkungan:
  ORQIVA_DATA_DIR, ORQIVA_PHP_BINARY, ORQIVA_APP_ROOT,
  ORQIVA_PUBLIC_URL, ORQIVA_BIND_HOST, ORQIVA_FRANKENPHP
`.trim();

export async function main(argv = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      port: { type: "string", short: "p" },
      host: { type: "string" },
      "public-url": { type: "string" },
      "no-open": { type: "boolean" },
      "data-dir": { type: "string" },
      lines: { type: "string" },
      label: { type: "string" },
      yes: { type: "boolean" },
    },
  });

  if (values.version) {
    console.log(currentVersion());
    return;
  }

  if (values.help) {
    console.log(HELP);
    return;
  }

  const command = positionals[0] || "start";
  const dataDir = values["data-dir"]
    ? getDataDir({ ...process.env, ORQIVA_DATA_DIR: values["data-dir"] })
    : getDataDir();
  const publicUrl = values["public-url"] || process.env.ORQIVA_PUBLIC_URL || null;

  if (publicUrl) normalizePublicUrl(publicUrl);

  switch (command) {
    case "start":
      await startRuntime({
        dataDir,
        port: values.port,
        bindHost: values.host,
        publicUrl,
        open: !values["no-open"],
      });
      break;

    case "stop":
      await stopRuntime(dataDir);
      break;

    case "status": {
      const status = await getRuntimeStatus(dataDir);
      if (!status.running) {
        console.log("Orqiva tidak sedang berjalan.");
        console.log(`Data: ${dataDir}`);
        break;
      }

      console.log(`Status: ${status.healthy ? "berjalan" : "tidak merespons"}`);
      console.log(`URL: ${status.state.url}`);
      console.log(`PID: ${status.state.pid}`);
      console.log(`Data: ${status.state.dataDir || dataDir}`);
      if (status.state.publicUrl) {
        console.log(`Publik: ${status.state.publicUrl}`);
      }
      break;
    }

    case "doctor": {
      const healthy = await runDoctor({
        dataDir,
        port: values.port ? Number(values.port) : 20129,
      });
      if (!healthy) process.exitCode = 1;
      break;
    }

    case "logs": {
      const paths = getRuntimePaths(dataDir);
      const lines = values.lines ? Number(values.lines) : 60;

      if (!Number.isInteger(lines) || lines < 1) {
        throw new Error("--lines harus berupa angka positif.");
      }

      if (
        !existsSync(paths.serverLog) &&
        !existsSync(paths.workerLog) &&
        !existsSync(paths.pollerLog)
      ) {
        console.log("Belum ada log. Jalankan Orqiva terlebih dahulu.");
        break;
      }

      console.log(`== Server (${paths.serverLog}) ==`);
      printLogTail(paths.serverLog, lines);
      console.log("");
      console.log(`== Worker (${paths.workerLog}) ==`);
      printLogTail(paths.workerLog, lines);
      console.log("");
      console.log(`== Telegram (${paths.pollerLog}) ==`);
      printLogTail(paths.pollerLog, lines);
      break;
    }

    case "backup":
      await backupRuntime(dataDir, values.label || null);
      break;

    case "restore": {
      const source = positionals[1];

      if (!source) {
        throw new Error("Sebutkan folder backup: orqiva restore <folder> --yes");
      }

      if (!values.yes) {
        const backups = await listBackups(dataDir);
        console.log("Restore akan menimpa data Orqiva saat ini.");
        console.log(`Jalankan: orqiva restore ${source} --yes`);
        if (backups.length > 0) {
          console.log("");
          console.log("Backup tersedia:");
          for (const backup of backups) console.log(`  ${backup}`);
        }
        break;
      }

      await restoreRuntime(dataDir, source);
      break;
    }

    case "update":
      await updateCli({ yes: Boolean(values.yes) });
      break;

    case "data":
      console.log(dataDir);
      break;

    case "help":
      console.log(HELP);
      break;

    default:
      throw new Error(`Perintah tidak dikenal: ${command}. Jalankan \`orqiva help\`.`);
  }
}
