import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageJson = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    "utf8",
  ),
);

export function currentVersion() {
  return packageJson.version;
}

export async function checkForUpdate() {
  let response;

  try {
    response = await fetch("https://registry.npmjs.org/orqiva/latest", {
      headers: { Accept: "application/vnd.npm.install-v1+json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error("Tidak dapat menghubungi npm registry. Periksa koneksi internet.");
  }

  if (!response.ok) {
    throw new Error(`npm registry mengembalikan HTTP ${response.status}.`);
  }

  const latest = (await response.json()).version;

  return {
    current: currentVersion(),
    latest,
    updateAvailable: Boolean(latest && compareVersions(latest, currentVersion()) > 0),
  };
}

export async function updateCli({ yes = false } = {}) {
  const result = await checkForUpdate();

  if (!result.updateAvailable) {
    console.log(`Orqiva ${result.current} sudah versi terbaru.`);
    return;
  }

  console.log(`Versi baru tersedia: ${result.current} -> ${result.latest}`);

  if (!yes) {
    console.log("Jalankan `npm install -g orqiva@latest` untuk memperbarui.");
    return;
  }

  console.log("Memperbarui Orqiva...");
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(command, ["install", "-g", "orqiva@latest"], {
    stdio: "inherit",
    windowsHide: true,
  });

  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });

  if (code !== 0) {
    throw new Error(`npm install gagal dengan exit code ${code}.`);
  }

  console.log("Orqiva diperbarui. Jalankan `orqiva` untuk memulai ulang server.");
}

export function compareVersions(left, right) {
  const parse = (value) =>
    String(value)
      .replace(/^v/, "")
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);

  const a = parse(left);
  const b = parse(right);

  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }

  return 0;
}
