import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const cliDir = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPackage = JSON.parse(
  readFileSync(join(cliDir, "package.json"), "utf8"),
);
const SUPPORTED = {
  linux: ["x64", "arm64"],
  darwin: ["x64", "arm64"],
  win32: ["x64"],
};

const { values } = parseArgs({
  options: {
    platform: { type: "string" },
    arch: { type: "string" },
    binary: { type: "string" },
    output: { type: "string", default: join(cliDir, "build", "runtimes") },
    version: { type: "string", default: cliPackage.version },
    url: { type: "string" },
  },
});

const platform = values.platform;
const arch = values.arch;

if (!SUPPORTED[platform]?.includes(arch)) {
  throw new Error(
    `Platform tidak didukung: ${platform}-${arch}. Pilihan: ${Object.entries(SUPPORTED)
      .map(([os, architectures]) => `${os}-${architectures.join("/")}`)
      .join(", ")}`,
  );
}

if (!values.binary && !values.url) {
  throw new Error("Sediakan --binary <path> atau --url <unduhan>.");
}

const name = `orqiva-runtime-${platform}-${arch}`;
const outputDirs = resolve(values.output);
const packageDir = join(outputDirs, name);
const stagingDir = join(outputDirs, `.${name}.staging`);
const executable = platform === "win32" ? "frankenphp.exe" : "frankenphp";

rmSync(stagingDir, { recursive: true, force: true });
rmSync(packageDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

const source = values.binary ? resolve(values.binary) : download(values.url);

if (statSync(source).isDirectory()) {
  cpSync(source, stagingDir, { recursive: true });
} else {
  cpSync(source, join(stagingDir, executable));
}

const files = findBinaryFiles(stagingDir, executable);

if (files.length === 0) {
  throw new Error(`Binary ${executable} tidak ditemukan di ${source}.`);
}

for (const file of files) {
  if (file.endsWith(executable)) chmodSync(file, 0o755);
}

writeFileSync(
  join(stagingDir, "package.json"),
  `${JSON.stringify(
    {
      name,
      version: values.version,
      description: `FrankenPHP runtime for Orqiva on ${platform}-${arch}.`,
      license: "MIT",
      os: [platform],
      cpu: [arch],
      files: fileNames(stagingDir),
      repository: cliPackage.repository,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(stagingDir, "README.md"),
  [
    `# ${name}`,
    "",
    `Bundled FrankenPHP runtime for Orqiva on ${platform}-${arch}.`,
    "Installed automatically as an optional dependency of the `orqiva` package.",
    "",
  ].join("\n"),
);

rmSync(packageDir, { recursive: true, force: true });
mkdirSync(dirname(packageDir), { recursive: true });
cpSync(stagingDir, packageDir, { recursive: true });
rmSync(stagingDir, { recursive: true, force: true });

console.log(`Runtime package dibuat: ${packageDir}`);

function download(url) {
  const fileName = basename(new URL(url).pathname) || "frankenphp-download";
  const destinationDir = join(outputDirs, ".downloads");
  const destination = join(destinationDir, fileName);

  mkdirSync(destinationDir, { recursive: true });

  if (!existsSync(destination)) {
    console.log(`Mengunduh ${url}`);
    const result = spawnSync("curl", ["-fsSL", "-o", destination, url], {
      stdio: "inherit",
    });

    if (result.status !== 0) {
      throw new Error(`Gagal mengunduh ${url}.`);
    }
  }

  if (fileName.endsWith(".zip")) {
    const extracted = `${destination}-extracted`;
    rmSync(extracted, { recursive: true, force: true });
    mkdirSync(extracted, { recursive: true });

    const result = spawnSync("unzip", ["-o", "-q", destination, "-d", extracted]);
    if (result.status !== 0) {
      throw new Error(`Gagal mengekstrak ${destination}; pastikan unzip tersedia.`);
    }

    return extracted;
  }

  return destination;
}

function findBinaryFiles(directory, executableName) {
  const results = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === executableName) {
        results.push(fullPath);
      }
    }
  };

  walk(directory);
  return results;
}

function fileNames(directory) {
  return readdirSync(directory).filter((entry) => entry !== "package.json");
}
