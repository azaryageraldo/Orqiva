import { spawnSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cliDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(cliDir, "..", "..");
const backendDir = join(repoRoot, "backend");
const frontendDir = join(repoRoot, "frontend");
const appDir = join(cliDir, "app");

const EXCLUDED_TOP_LEVEL = new Set([
  ".env",
  ".env.backup",
  ".phpunit.result.cache",
  "node_modules",
  "tests",
]);

run("npm", ["run", "build:app"], frontendDir);

if (!existsSync(join(backendDir, "vendor", "autoload.php"))) {
  throw new Error("backend/vendor belum terinstall. Jalankan composer install dulu.");
}

if (!existsSync(join(backendDir, "public", "app.html"))) {
  throw new Error("Frontend build tidak menghasilkan backend/public/app.html.");
}

await rm(appDir, { recursive: true, force: true });
await mkdir(appDir, { recursive: true });

await cp(backendDir, appDir, {
  recursive: true,
  filter: (source) => {
    const relativePath = relative(backendDir, source).replaceAll("\\", "/");

    if (!relativePath) return true;
    if (EXCLUDED_TOP_LEVEL.has(relativePath.split("/")[0])) return false;
    if (relativePath === "database/database.sqlite") return false;
    if (relativePath.startsWith("bootstrap/cache/") && relativePath.endsWith(".php")) {
      return false;
    }
    if (relativePath.startsWith("storage/framework/views/")) return false;
    if (relativePath.startsWith("storage/framework/sessions/")) return false;
    if (relativePath.startsWith("storage/logs/")) return false;
    if (relativePath.startsWith("storage/framework/cache/data/")) return false;

    return true;
  },
});

console.log(`Paket siap: ${appDir}`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} gagal.`);
  }
}
