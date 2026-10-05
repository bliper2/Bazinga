/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Blocks Discord's analytics and crash-report requests before they leave the computer.
// Equicord's NoTrack plugin does this inside the page; this also covers requests made before plugins start.

import { session } from "electron";
import { IpcEvents } from "shared/IpcEvents";

import { Settings } from "./settings";
import { handle } from "./utils/ipcWrappers";

const PATTERNS = [
    "https://*.discord.com/api/*/science",
    "https://*.discord.com/api/*/metrics",
    "https://*.discord.com/api/*/track",
    "https://discord.com/api/*/science",
    "https://discord.com/api/*/metrics",
    "https://discord.com/api/*/track",
    "https://*.sentry.io/*",
    "https://sentry.discord.media/*",
    "https://crash.discordapp.com/*"
];

export interface BlockedRequest {
    time: number;
    host: string;
    path: string;
}

const MAX_LOG = 200;
const blocked: BlockedRequest[] = [];
let total = 0;

export function startTelemetryBlocking() {
    session.defaultSession.webRequest.onBeforeRequest({ urls: PATTERNS }, (details, callback) => {
        if (!Settings.store.blockTelemetry) return callback({});

        total++;
        try {
            const url = new URL(details.url);
            blocked.push({ time: Date.now(), host: url.hostname, path: url.pathname });
            if (blocked.length > MAX_LOG) blocked.shift();
        } catch {
            // A malformed URL is still blocked, just not logged.
        }
        callback({ cancel: true });
    });
}

handle(IpcEvents.GET_BLOCKED_REQUESTS, () => ({ total, recent: blocked.slice().reverse() }));
