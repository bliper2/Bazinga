/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { existsSync } from "original-fs";
import { join } from "path";

import { SESSION_DATA_DIR } from "./constants";
import { State } from "./settings";

// Output of `bun buildEquicord`. Used directly when running from source so plugin changes need no release.
const DEV_EQUICORD_ASAR = join(__dirname, "..", "equicord", "equibop.asar");

// Shipped inside the installer so the first launch does not need a download.
export const SEED_EQUICORD_ASAR = join(process.resourcesPath, "equicord-seed.bin");

// this is in a separate file to avoid circular dependencies
export const VENCORD_DIR = State.store.equicordDir
    ? join(State.store.equicordDir, "equibop")
    : !app.isPackaged && existsSync(DEV_EQUICORD_ASAR)
      ? DEV_EQUICORD_ASAR
      : join(SESSION_DATA_DIR, "equicord.asar");
