/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import { definePlugin, interceptNotifications } from "../_bazinga";

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const isValidTime = (value: string) => TIME.test(value.trim()) || "Use 24-hour time, like 22:00";

const settings = definePluginSettings({
    start: {
        type: OptionType.STRING,
        description: "Quiet time starts at (24-hour time)",
        default: "22:00",
        isValid: isValidTime
    },
    end: {
        type: OptionType.STRING,
        description: "Quiet time ends at (24-hour time)",
        default: "08:00",
        isValid: isValidTime
    },
    blockNotifications: {
        type: OptionType.BOOLEAN,
        description: "Hide desktop notifications during quiet time",
        default: true
    },
    muteSounds: {
        type: OptionType.BOOLEAN,
        description: "Mute notification sounds during quiet time (voice chat is not affected)",
        default: true
    }
});

let snoozeUntil = 0;
let stopHolding: (() => void) | undefined;

function minutesOf(value: string) {
    const match = TIME.exec(value.trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isQuiet(now = new Date()) {
    if (Date.now() < snoozeUntil) return true;

    const start = minutesOf(settings.store.start);
    const end = minutesOf(settings.store.end);
    if (start === null || end === null || start === end) return false;

    const current = now.getHours() * 60 + now.getMinutes();
    // A window like 22:00 to 08:00 wraps past midnight.
    return start < end ? current >= start && current < end : current >= start || current < end;
}

function quietFor(minutes: number) {
    snoozeUntil = Date.now() + minutes * 60_000;
    showToast(`Quiet until ${new Date(snoozeUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, Toasts.Type.SUCCESS);
}

export default definePlugin({
    name: "QuietHours",
    description: "Silences desktop notifications and notification sounds during the hours you choose, without changing your status.",
    tags: ["Notifications", "Utility"],
    searchTerms: ["dnd", "do not disturb", "schedule", "night", "mute", "quiet"],
    settings,

    toolboxActions: {
        "Quiet for 1 hour": () => quietFor(60),
        "Quiet for 3 hours": () => quietFor(180),
        "End quiet time now": () => {
            snoozeUntil = 0;
            showToast("Quiet time ended", Toasts.Type.MESSAGE);
        }
    },

    patches: [
        {
            // Same spot Equicord's NotificationVolume uses to scale notification sound volume.
            find: "ensureAudio(){",
            replacement: {
                match: /(?=Math\.min\(\i\.\i\.getOutputVolume\(\)\/100)/g,
                replace: "$self.soundVolumeFactor()*"
            }
        }
    ],

    soundVolumeFactor() {
        return settings.store.muteSounds && isQuiet() ? 0 : 1;
    },

    start() {
        stopHolding = interceptNotifications(() => settings.store.blockNotifications && isQuiet());
    },

    stop() {
        stopHolding?.();
        stopHolding = undefined;
        snoozeUntil = 0;
    }
});
