#!/usr/bin/env node
import { spawn } from "node:child_process";

const command = process.argv[2];

if (command === "start") {
  const child = spawn("npx", ["tsx", "src/daemon.ts"], {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  console.log("Usage: codehands start");
}