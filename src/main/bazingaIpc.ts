/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// IPC handlers for the Bazinga-only features in the settings page.

import { spawn } from "child_process";
import { app, dialog } from "electron";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { IpcEvents } from "shared/IpcEvents";

import { isValidProfileName, PROFILE } from "./cli";
import {
    DATA_DIR,
    PORTABLE,
    PROFILES_DIR,
    VENCORD_QUICKCSS_FILE,
    VENCORD_SETTINGS_FILE,
    VENCORD_THEMES_DIR
} from "./constants";
import { mainWin } from "./mainWindow";
import { isSafeMode } from "./safeMode";
import { Settings, State } from "./settings";
import { decryptBundle, encryptBundle, SettingsBundle, validateBundle } from "./settingsBackup";
import { getStartupTimings } from "./startupTimings";
import { destroyTray } from "./tray";
import { handle } from "./utils/ipcWrappers";
import { restoreBundledEquicord } from "./utils/vencordLoader";

const THEME_FILE = /^[\w\-. ()[\]]+\.css$/;

handle(IpcEvents.RELOAD_CLIENT, () => mainWin?.webContents.reload());
handle(IpcEvents.GET_STARTUP_TIMINGS, () => getStartupTimings());

handle(IpcEvents.LIST_PROFILES, () => ({
    current: PROFILE ?? null,
    profiles: existsSync(PROFILES_DIR)
        ? readdirSync(PROFILES_DIR, { withFileTypes: true })
              .filter(d => d.isDirectory())
              .map(d => d.name)
        : []
}));

handle(IpcEvents.OPEN_PROFILE, (_e, name: string | null) => {
    if (name !== null && (typeof name !== "string" || !isValidProfileName(name))) {
        throw new Error("Profile names can use letters, numbers, spaces, dots, dashes and underscores (up to 32).");
    }

    // Keep the arguments this instance was started with, but swap the profile.
    const args = process.argv.slice(1);
    const kept: string[] = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--profile") i++;
        else if (!args[i].startsWith("--profile=")) kept.push(args[i]);
    }
    if (name !== null) kept.push("--profile", name);

    spawn(process.execPath, kept, { detached: true, stdio: "ignore" }).unref();
});

// No file paths here, because they contain the user's name and this text is meant to be pasted into issues.
handle(IpcEvents.GET_DEBUG_INFO, () =>
    [
        `Bazinga ${app.getVersion()}`,
        `Electron ${process.versions.electron}, Chromium ${process.versions.chrome}, Node ${process.versions.node}`,
        `${process.platform} ${process.arch}`,
        `Discord branch: ${Settings.store.discordBranch}`,
        `Profile: ${PROFILE ?? "default"}`,
        `Portable: ${PORTABLE}`,
        `Safe mode: ${isSafeMode()}`,
        `Custom Equicord folder: ${!!State.store.equicordDir}`,
        `Performance preset: ${Settings.store.performancePreset}, low-end mode: ${Settings.store.lowEndMode}`,
        `Hardware acceleration: ${Settings.store.hardwareAcceleration}`
    ].join("\n")
);

handle(IpcEvents.RESTORE_BUNDLED_EQUICORD, () => {
    restoreBundledEquicord();
    destroyTray();
    app.relaunch();
    app.quit();
});

function readText(path: string) {
    try {
        return readFileSync(path, "utf-8");
    } catch {
        return "";
    }
}

handle(IpcEvents.EXPORT_SETTINGS, async (_e, password?: string) => {
    const bundle: SettingsBundle = {
        format: "bazinga-settings",
        version: 1,
        bazinga: Settings.plain,
        equicord: readText(VENCORD_SETTINGS_FILE),
        quickCss: readText(VENCORD_QUICKCSS_FILE),
        themes: Object.fromEntries(
            (existsSync(VENCORD_THEMES_DIR) ? readdirSync(VENCORD_THEMES_DIR) : [])
                .filter(f => THEME_FILE.test(f))
                .map(f => [f, readText(join(VENCORD_THEMES_DIR, f))])
        )
    };

    const { canceled, filePath } = await dialog.showSaveDialog(mainWin, {
        title: "Export Bazinga settings",
        defaultPath: password ? "bazinga-settings.encrypted.json" : "bazinga-settings.json",
        filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (canceled || !filePath) return "cancelled";

    writeFileSync(filePath, JSON.stringify(password ? encryptBundle(bundle, password) : bundle, null, 2));
    return "ok";
});

handle(IpcEvents.IMPORT_SETTINGS, async (_e, password?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWin, {
        title: "Import Bazinga settings",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (canceled || !filePaths[0]) return "cancelled";

    let parsed: unknown;
    try {
        parsed = JSON.parse(readFileSync(filePaths[0], "utf-8"));
    } catch {
        return "invalid";
    }

    let bundle: unknown = parsed;
    if (parsed && typeof parsed === "object" && (parsed as { encrypted?: boolean }).encrypted) {
        if (!password) return "password-needed";
        try {
            bundle = decryptBundle(parsed as never, password);
        } catch {
            return "wrong-password";
        }
    }
    if (!validateBundle(bundle)) return "invalid";

    const confirm = await dialog.showMessageBox(mainWin, {
        type: "question",
        buttons: ["Import and restart", "Cancel"],
        defaultId: 1,
        cancelId: 1,
        title: "Import settings",
        message: "Replace your current settings with the imported ones?",
        detail: "Your Bazinga settings, Equicord settings, QuickCSS and themes will be replaced. You stay logged in."
    });
    if (confirm.response !== 0) return "cancelled";

    mkdirSync(VENCORD_THEMES_DIR, { recursive: true });
    writeFileSync(join(DATA_DIR, "settings.json"), JSON.stringify(bundle.bazinga, null, 4));
    writeFileSync(VENCORD_SETTINGS_FILE, bundle.equicord);
    writeFileSync(VENCORD_QUICKCSS_FILE, bundle.quickCss);
    for (const [name, css] of Object.entries(bundle.themes)) writeFileSync(join(VENCORD_THEMES_DIR, name), css);

    destroyTray();
    app.relaunch();
    app.exit(0);
    return "ok";
});
