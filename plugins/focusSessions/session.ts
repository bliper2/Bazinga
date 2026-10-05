/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** "24:05" for 24 minutes 5 seconds, "1:02:03" with hours. Zero or less shows "0:00". */
export function formatRemaining(ms: number) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** One line about the notifications that were held back, such as "5 notifications from Ann, Bob and 2 others". */
export function summarizeHeld(titles: string[]) {
    if (!titles.length) return "";

    const counts = new Map<string, number>();
    for (const title of titles) counts.set(title, (counts.get(title) ?? 0) + 1);
    const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);

    const shown = names.slice(0, 3);
    const rest = names.length - shown.length;
    const list = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
    const noun = titles.length === 1 ? "notification" : "notifications";
    return rest > 0 ? `${titles.length} ${noun} from ${shown.join(", ")} and ${rest} other${rest === 1 ? "" : "s"}` : `${titles.length} ${noun} from ${list}`;
}
