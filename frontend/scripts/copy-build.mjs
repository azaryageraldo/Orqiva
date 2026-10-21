import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(frontendDir, "dist");
const publicDir = join(frontendDir, "..", "backend", "public");

await mkdir(publicDir, { recursive: true });
await rm(join(publicDir, "assets"), { recursive: true, force: true });
await rm(join(publicDir, "app.html"), { force: true });

await cp(join(distDir, "assets"), join(publicDir, "assets"), {
  recursive: true,
});

for (const entry of await readdir(distDir, { withFileTypes: true })) {
  if (entry.name === "assets" || entry.name === "index.html") {
    continue;
  }

  await cp(join(distDir, entry.name), join(publicDir, entry.name), {
    recursive: true,
  });
}

await cp(join(distDir, "index.html"), join(publicDir, "app.html"));
