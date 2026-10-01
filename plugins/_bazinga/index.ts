/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Shared helpers for Bazinga plugins. Folders starting with "_" are not loaded as plugins.

import { Logger } from "@utils/Logger";
import equicordDefinePlugin, { PluginAuthor, PluginDef } from "@utils/types";
import { Alerts } from "@webpack/common";
import type { ReactNode } from "react";

export const BazingaDevs = {
    bliper2: { name: "bliper2", id: 0n }
} satisfies Record<string, PluginAuthor>;

/**
 * Equicord's definePlugin with Bazinga defaults: the author defaults to the Bazinga team and the
 * "bazinga" search term is added, so searching the Plugins page for "bazinga" lists every Bazinga plugin.
 *
 * Keep `name` as the first property with a plain string value; Equicord's build reads it from the source.
 */
export function definePlugin<P extends Omit<PluginDef, "authors"> & Partial<Pick<PluginDef, "authors">>>(plugin: P & Record<PropertyKey, any>) {
    return equicordDefinePlugin({
        authors: [BazingaDevs.bliper2],
        ...plugin,
        searchTerms: [...(plugin.searchTerms ?? []), "bazinga"]
    } as P & PluginDef & Record<PropertyKey, any>);
}

export function bazingaLogger(pluginName: string) {
    return new Logger(pluginName, "#f5a524");
}

/**
 * Wraps a callback that runs outside Equicord's own error handling (DOM listeners, timers, observers),
 * so an exception is logged instead of breaking Discord.
 */
export function guard<A extends unknown[]>(logger: Logger, label: string, fn: (...args: A) => void) {
    return (...args: A) => {
        try {
            fn(...args);
        } catch (err) {
            logger.error(label, err);
        }
    };
}

export interface ConfirmOptions {
    title: string;
    body: ReactNode;
    confirmText: string;
    cancelText: string;
    /** Adds a third button. Resolves to "secondary" when it is chosen. */
    secondaryText?: string;
}

/** Shows a Discord-style dialog and resolves with the button the user chose. Closing the dialog counts as cancel. */
export function confirmDialog(options: ConfirmOptions): Promise<"confirm" | "secondary" | "cancel"> {
    return new Promise(resolve => {
        let settled = false;
        const settle = (choice: "confirm" | "secondary" | "cancel") => {
            if (settled) return;
            settled = true;
            resolve(choice);
        };

        Alerts.show({
            title: options.title,
            body: options.body,
            confirmText: options.confirmText,
            cancelText: options.cancelText,
            secondaryConfirmText: options.secondaryText,
            onConfirm: () => settle("confirm"),
            onConfirmSecondary: () => settle("secondary"),
            onCancel: () => settle("cancel"),
            onCloseCallback: () => settle("cancel")
        });
    });
}

/**
 * Checks a keyboard event against a shortcut written like "Ctrl+Shift+B".
 * Modifiers not named in the shortcut must not be held. An empty shortcut never matches.
 */
export function matchesShortcut(e: KeyboardEvent, shortcut: string) {
    const parts = shortcut.toLowerCase().split("+").map(p => p.trim()).filter(Boolean);
    const key = parts.pop();
    if (!key) return false;

    return e.key.toLowerCase() === key
        && e.ctrlKey === parts.includes("ctrl")
        && e.shiftKey === parts.includes("shift")
        && e.altKey === parts.includes("alt")
        && e.metaKey === parts.includes("meta");
}
