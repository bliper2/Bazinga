/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Seconds spent per place, per day. Days are written 2026-10-05; places are server ids, or "dm". */
export type Usage = Record<string, Record<string, number>>;

export const KEEP_DAYS = 90;

export const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Returns new usage with `seconds` added to a place, and days older than KEEP_DAYS removed. */
export function addUsage(usage: Usage, place: string, seconds: number, now: Date): Usage {
    const today = dayKey(now);
    const cutoff = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - KEEP_DAYS));

    const next: Usage = {};
    for (const [day, places] of Object.entries(usage)) if (day >= cutoff) next[day] = places;
    next[today] = { ...next[today], [place]: (next[today]?.[place] ?? 0) + seconds };
    return next;
}

/** Total seconds per place over the last `days` days, today included, biggest first. */
export function totalsForLast(usage: Usage, days: number, now: Date) {
    const first = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
    const totals = new Map<string, number>();

    for (const [day, places] of Object.entries(usage)) {
        if (day < first) continue;
        for (const [place, seconds] of Object.entries(places)) totals.set(place, (totals.get(place) ?? 0) + seconds);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export const secondsToday = (usage: Usage, now: Date) =>
    Object.values(usage[dayKey(now)] ?? {}).reduce((sum, seconds) => sum + seconds, 0);

export function formatDuration(seconds: number) {
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return "under a minute";
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
