/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { THEMES_DIR } from "@main/utils/constants";
import { ensureSafePath } from "@main/utils/ensureSafePath";
import { IpcMainInvokeEvent } from "electron";
import { mkdirSync, writeFileSync } from "fs";

const STUDIO_FILE = /^Studio-[\w()-]{1,40}\.theme\.css$/;
const MAX_LENGTH = 200 * 1024;

/** Saves a theme made in Theme Studio. Only files named Studio-*.theme.css inside the themes folder are accepted. */
export function saveStudioTheme(_: IpcMainInvokeEvent, fileName: string, css: string) {
    if (typeof fileName !== "string" || !STUDIO_FILE.test(fileName)) throw new Error("Invalid theme file name");
    if (typeof css !== "string" || css.length > MAX_LENGTH) throw new Error("The theme is too large");

    const path = ensureSafePath(THEMES_DIR, fileName);
    if (!path) throw new Error("Invalid theme file name");

    mkdirSync(THEMES_DIR, { recursive: true });
    writeFileSync(path, css);
}
