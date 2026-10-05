/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Safe mode starts Discord with Equicord's plugins, themes and QuickCSS all off, and keeps whatever the user
// changes in memory only. It is for finding out which plugin or theme breaks Discord.
// It starts by itself after three starts in a row that crashed or were killed within a minute.

import { app, dialog, ipcMain } from "electron";
import { readFileSync } from "fs";

import { CommandLine } from "./cli";
import { VENCORD_SETTINGS_FILE } from "./constants";
import { State } from "./settings";

const CRASH_LIMIT = 3;
const HEALTHY_AFTER_MS = 60_000;

let active = !!CommandLine.values["safe-mode"];
let startedAutomatically = false;

export const isSafeMode = () => active;

/** Call once at startup, before the window opens. */
export function recordStart() {
    if (active) return;

    const attempts = State.store.startAttempts ?? 0;
    if (attempts >= CRASH_LIMIT) {
        active = true;
        startedAutomatically = true;
        State.store.startAttempts = 0;
        return;
    }

    State.store.startAttempts = attempts + 1;
    setTimeout(() => (State.store.startAttempts = 0), HEALTHY_AFTER_MS).unref();
    app.on("before-quit", () => (State.store.startAttempts = 0));
}

/** Call after Equicord's main script has registered its settings handlers. */
export function applySafeMode() {
    if (!active) return;

    let settings: Record<string, any> = {};
    try {
        settings = JSON.parse(readFileSync(VENCORD_SETTINGS_FILE, "utf-8"));
    } catch {
        // No settings file yet; the defaults below are enough.
    }

    const plugins = Object.fromEntries(
        Object.entries(settings.plugins ?? {}).map(([name, value]) => [name, { ...(value as object), enabled: false }])
    );
    // `__bazingaSafeMode` is read by a small patch to Equicord's settings defaults (see scripts/build/buildEquicord.mts),
    // which turns off plugins that are on by default and were never saved to the settings file.
    const safeSettings = {
        ...settings,
        plugins,
        enabledThemes: [],
        enabledThemeLinks: [],
        useQuickCss: false,
        __bazingaSafeMode: true
    };

    ipcMain.removeAllListeners("VencordGetSettings");
    ipcMain.on("VencordGetSettings", e => (e.returnValue = safeSettings));
    ipcMain.removeHandler("VencordSetSettings");
    ipcMain.handle("VencordSetSettings", () => {});
}

export function explainAutomaticSafeMode() {
    if (!startedAutomatically) return;

    dialog.showMessageBox({
        type: "warning",
        title: "Bazinga started in safe mode",
        message: "Bazinga did not start properly three times in a row.",
        detail:
            "So that you can fix the problem, all plugins and themes are off this time, and nothing you change is saved.\n\n" +
            "Turn plugins on one by one to find the one that causes it, then restart Bazinga to leave safe mode."
    });
}
