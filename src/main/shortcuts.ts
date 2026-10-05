/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Global shortcuts work even when Bazinga is not the focused window.

import { app, BrowserWindow, globalShortcut } from "electron";
import { IpcEvents } from "shared/IpcEvents";

import { Settings } from "./settings";

function register(accelerator: string, action: () => void) {
    if (!accelerator.trim()) return;
    try {
        if (!globalShortcut.register(accelerator.trim(), action)) {
            console.warn(`[Shortcuts] ${accelerator} is already used by another program`);
        }
    } catch (err) {
        console.warn(`[Shortcuts] ${accelerator} is not a valid shortcut:`, err);
    }
}

export function setupGlobalShortcuts(win: BrowserWindow) {
    const apply = () => {
        globalShortcut.unregisterAll();

        register(Settings.store.globalShowHideShortcut, () => {
            if (win.isVisible() && win.isFocused()) win.hide();
            else {
                if (win.isMinimized()) win.restore();
                win.show();
                win.focus();
            }
        });
        register(Settings.store.globalMuteShortcut, () => win.webContents.send(IpcEvents.TOGGLE_SELF_MUTE));
    };

    apply();
    Settings.addChangeListener("globalShowHideShortcut", apply);
    Settings.addChangeListener("globalMuteShortcut", apply);
    app.on("will-quit", () => globalShortcut.unregisterAll());
}
