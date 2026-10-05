/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ScheduleConfig {
    /** "time" follows the clock, "system" follows the operating system's light or dark setting. */
    mode: "off" | "time" | "system";
    /** Theme file names. Empty means no theme for that time. */
    dayTheme: string;
    nightTheme: string;
    /** 24-hour times like "07:00". */
    dayStart: string;
    nightStart: string;
    /** Server id to theme file name. A server theme wins over the clock and the system setting. */
    guildThemes: Record<string, string>;
}

export const DEFAULT_CONFIG: ScheduleConfig = {
    mode: "off",
    dayTheme: "",
    nightTheme: "",
    dayStart: "07:00",
    nightStart: "19:00",
    guildThemes: {}
};

function minutes(time: string, fallback: number) {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
}

/** True between the night start and the day start. The night may run past midnight. */
export function isNight(now: Date, dayStart: string, nightStart: string) {
    const current = now.getHours() * 60 + now.getMinutes();
    const day = minutes(dayStart, 7 * 60);
    const night = minutes(nightStart, 19 * 60);

    if (day === night) return false;
    return day < night ? current < day || current >= night : current >= night && current < day;
}

/** The theme the schedule wants right now, or null when it wants none. */
export function desiredTheme(config: ScheduleConfig, context: { now: Date; systemDark: boolean; guildId: string | null; }) {
    const guildTheme = context.guildId ? config.guildThemes[context.guildId] : undefined;
    if (guildTheme) return guildTheme;

    if (config.mode === "off") return null;
    const night = config.mode === "system" ? context.systemDark : isNight(context.now, config.dayStart, config.nightStart);
    return (night ? config.nightTheme : config.dayTheme) || null;
}

/** Every theme the schedule might switch between. */
export function managedThemes(config: ScheduleConfig) {
    return [...new Set([config.dayTheme, config.nightTheme, ...Object.values(config.guildThemes)].filter(Boolean))];
}

/** The list of turned-on themes after the schedule's choice is applied. Themes it does not manage are left alone. */
export function applyDesired(enabled: string[], managed: string[], desired: string | null) {
    const rest = enabled.filter(theme => !managed.includes(theme));
    return desired ? [...rest, desired] : rest;
}
