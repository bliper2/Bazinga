/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Packaging replaces dist/win-unpacked, which Windows locks while Bazinga runs from it.
// Killing the app would log the user out (Discord saves its login only on a normal close),
// so ask the running instance to quit cleanly with --quit and wait for it to exit.

import { execFileSync, spawnSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const EXE = join(import.meta.dirname, "../../dist/win-unpacked/bazinga.exe");
const TIMEOUT_MS = 20_000;

function isRunning() {
    const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq bazinga.exe", "/NH"], { encoding: "utf-8" });
    return out.toLowerCase().includes("bazinga.exe");
}

if (process.platform === "win32" && existsSync(EXE) && isRunning()) {
    console.log("Bazinga is running. Asking it to quit cleanly so you stay logged in...");
    spawnSync(EXE, ["--quit"], { stdio: "ignore", timeout: 10_000 });

    const deadline = Date.now() + TIMEOUT_MS;
    while (isRunning() && Date.now() < deadline) await new Promise(r => setTimeout(r, 500));

    if (isRunning()) {
        console.error("Bazinga is still running. Quit it from the tray icon (right-click, Quit), then build again.");
        process.exit(1);
    }
    console.log("Bazinga closed.");
}
