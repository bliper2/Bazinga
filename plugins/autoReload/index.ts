/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { pluginRequiresRestart, plugins } from "@api/PluginManager";
import { definePluginSettings, SettingsStore } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin } from "../_bazinga";

const logger = bazingaLogger("AutoReload");

const settings = definePluginSettings({
    delaySeconds: {
        type: OptionType.SLIDER,
        description: "How long to wait before reloading, so you can turn on several plugins first",
        markers: [2, 3, 5, 8, 10],
        default: 4,
        stickToMarkers: false
    }
});

const PLUGIN_ENABLED = /^plugins\.([^.]+)\.enabled$/;

let timer: ReturnType<typeof setTimeout> | undefined;
let changed = new Set<string>();

function cancel() {
    clearTimeout(timer);
    timer = undefined;
    changed = new Set();
}

function reloadSoon() {
    clearTimeout(timer);
    const names = [...changed];
    const seconds = settings.store.delaySeconds;

    showNotification({
        title: `Reloading in ${seconds} seconds`,
        body: `${names.join(", ")} needs a reload to apply. Click here to cancel.`,
        color: "var(--brand-500)",
        noPersist: true,
        onClick: cancel
    });

    timer = setTimeout(() => {
        timer = undefined;
        // Plugins are updated separately from the app, so an older app may not have this yet.
        Promise.resolve()
            .then(() => VesktopNative.bazinga.reload())
            .catch(() => window.location.reload());
    }, seconds * 1000);
}

const onSettingsChange = (_: unknown, path: string) => {
    try {
        const name = PLUGIN_ENABLED.exec(path)?.[1];
        const plugin = name && plugins[name];
        if (!plugin || name === "AutoReload" || !pluginRequiresRestart(plugin)) return;

        changed.add(name);
        reloadSoon();
    } catch (err) {
        logger.error("Failed to schedule a reload", err);
    }
};

export default definePlugin({
    name: "AutoReload",
    description: "Reloads Discord by itself a few seconds after you turn on or off a plugin that needs it, instead of asking you to.",
    tags: ["Utility", "Developers"],
    searchTerms: ["reload", "restart", "plugin", "refresh"],
    settings,

    start() {
        SettingsStore.addGlobalChangeListener(onSettingsChange);
    },

    stop() {
        SettingsStore.removeGlobalChangeListener(onSettingsChange);
        cancel();
    }
});
