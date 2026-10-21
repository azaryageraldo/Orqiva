import assert from "node:assert/strict";
import test from "node:test";

import { checkForUpdate, compareVersions, currentVersion } from "../src/update.js";

function fakeResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

test("compares semantic versions", () => {
  assert.equal(compareVersions("0.2.0", "0.1.0") > 0, true);
  assert.equal(compareVersions("0.1.0", "0.1.0"), 0);
  assert.equal(compareVersions("0.1.0", "0.1.1") > 0, false);
  assert.equal(compareVersions("v1.2.3", "1.2.3"), 0);
  assert.equal(compareVersions("0.2.0-beta.1", "0.2.0") > 0, false);
});

test("reads the latest dist-tag from the registry", async () => {
  let requestedUrl = "";

  const result = await checkForUpdate({
    fetcher: async (url) => {
      requestedUrl = url;

      return fakeResponse({ latest: "0.1.0" });
    },
  });

  assert.match(requestedUrl, /\/-\/package\/orqiva\/dist-tags$/);
  assert.equal(result.latest, "0.1.0");
  assert.equal(result.current, currentVersion());
  assert.equal(result.updateAvailable, false);
});

test("detects a newer published version", async () => {
  const result = await checkForUpdate({
    fetcher: async () => fakeResponse({ latest: "9.9.9" }),
  });

  assert.equal(result.updateAvailable, true);
});

test("reports registry errors", async () => {
  await assert.rejects(
    checkForUpdate({
      fetcher: async () => fakeResponse({}, { ok: false, status: 406 }),
    }),
    /HTTP 406/,
  );
});
