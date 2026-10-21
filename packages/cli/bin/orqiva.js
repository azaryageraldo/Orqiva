#!/usr/bin/env node

import { main } from "../src/cli.js";

main().catch((error) => {
  console.error(`Orqiva: ${error.message}`);

  if (process.env.ORQIVA_DEBUG === "1") {
    console.error(error.stack);
  }

  process.exit(1);
});
