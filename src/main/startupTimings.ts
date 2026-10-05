/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Records how long each step of starting the app takes, shown under Settings, Performance.

const marks: Record<string, number> = {};

/** Notes that a startup step has finished. Time is measured from when the process started. */
export function markStartup(step: string) {
    marks[step] ??= Math.round(process.uptime() * 1000);
}

export function getStartupTimings() {
    return Object.entries(marks).map(([step, ms]) => ({ step, ms }));
}
