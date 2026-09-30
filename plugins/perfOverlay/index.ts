/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, guard } from "../_bazinga";

const logger = bazingaLogger("PerfOverlay");

const UPDATE_MS = 500;
const DOM_COUNT_MS = 2000;
const LONG_TASK_WINDOW_MS = 10_000;

const settings = definePluginSettings({
    position: {
        type: OptionType.SELECT,
        description: "Corner of the window to show the overlay in",
        options: [
            { label: "Bottom right", value: "bottom-right", default: true },
            { label: "Bottom left", value: "bottom-left" },
            { label: "Top right", value: "top-right" },
            { label: "Top left", value: "top-left" }
        ]
    },
    showMemory: {
        type: OptionType.BOOLEAN,
        description: "Show JavaScript heap usage",
        default: true
    },
    showDomNodes: {
        type: OptionType.BOOLEAN,
        description: "Show the number of elements on the page (counted every 2 seconds)",
        default: true
    },
    showLongTasks: {
        type: OptionType.BOOLEAN,
        description: "Show tasks that blocked the page for more than 50 ms in the last 10 seconds",
        default: true
    }
});

let overlay: HTMLDivElement | null = null;
let frameHandle = 0;
let updateTimer: ReturnType<typeof setInterval> | undefined;
let longTaskObserver: PerformanceObserver | undefined;
let frames = 0;
let lastUpdate = 0;
let domNodes = 0;
let lastDomCount = 0;
let longTasks: { end: number; duration: number; }[] = [];

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

function countFrame() {
    frames++;
    frameHandle = requestAnimationFrame(countFrame);
}

const update = guard(logger, "Failed to update overlay", () => {
    if (!overlay) return;

    const now = performance.now();
    const fps = Math.round((frames * 1000) / (now - lastUpdate));
    frames = 0;
    lastUpdate = now;

    const { position, showMemory, showDomNodes, showLongTasks } = settings.store;
    const lines = [`FPS ${fps}`];

    // performance.memory is a non-standard Chromium API.
    const { memory } = performance as any;
    if (showMemory && memory) lines.push(`Heap ${mb(memory.usedJSHeapSize)} / ${mb(memory.jsHeapSizeLimit)}`);

    if (showDomNodes) {
        if (now - lastDomCount > DOM_COUNT_MS) {
            domNodes = document.getElementsByTagName("*").length;
            lastDomCount = now;
        }
        lines.push(`DOM ${domNodes.toLocaleString()} nodes`);
    }

    if (showLongTasks) {
        longTasks = longTasks.filter(t => now - t.end < LONG_TASK_WINDOW_MS);
        const blocked = longTasks.reduce((sum, t) => sum + t.duration, 0);
        lines.push(`Long tasks ${longTasks.length} (${Math.round(blocked)} ms / 10 s)`);
    }

    overlay.dataset.position = position;
    overlay.dataset.slow = String(fps < 30);
    overlay.textContent = lines.join("\n");
});

function show() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "bz-perf-overlay";
    document.body.append(overlay);

    try {
        longTaskObserver = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                longTasks.push({ end: entry.startTime + entry.duration, duration: entry.duration });
            }
        });
        longTaskObserver.observe({ type: "longtask", buffered: false });
    } catch (err) {
        logger.warn("Long task timing is not available", err);
    }

    frames = 0;
    lastUpdate = performance.now();
    frameHandle = requestAnimationFrame(countFrame);
    updateTimer = setInterval(update, UPDATE_MS);
}

function hide() {
    cancelAnimationFrame(frameHandle);
    clearInterval(updateTimer);
    longTaskObserver?.disconnect();
    longTaskObserver = undefined;
    longTasks = [];
    overlay?.remove();
    overlay = null;
}

export default definePlugin({
    name: "PerfOverlay",
    description: "Shows frame rate, memory use, page size and blocking tasks in a small overlay.",
    tags: ["Developers", "Utility"],
    searchTerms: ["fps", "performance", "memory", "overlay"],
    settings,
    toolboxActions: {
        "Toggle performance overlay": () => (overlay ? hide() : show())
    },

    start: show,
    stop: hide
});
