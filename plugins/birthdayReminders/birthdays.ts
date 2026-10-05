/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Birthday {
    name: string;
    month: number;
    day: number;
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Reads a list written one person per line, like "Sam 03-14" or "Sam, 14.03" is not accepted: the date is month-day.
 * Returns the people it understood and the lines it did not.
 */
export function parseBirthdays(text: string) {
    const birthdays: Birthday[] = [];
    const bad: string[] = [];

    for (const line of text.split("\n").map(l => l.trim()).filter(Boolean)) {
        const match = /^(.+?)[\s,;:-]+(\d{1,2})[-/](\d{1,2})$/.exec(line);
        const month = Number(match?.[2]);
        const day = Number(match?.[3]);

        if (match && month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1]) {
            birthdays.push({ name: match[1].trim().slice(0, 40), month, day });
        } else {
            bad.push(line);
        }
    }
    return { birthdays, bad };
}

/** Whole days from `now` until the next time the date comes round, 0 if it is today. */
export function daysUntil(birthday: Birthday, now: Date) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Feb 29 is celebrated on Mar 1 in years that have no Feb 29.
    const target = (year: number) => {
        const date = new Date(year, birthday.month - 1, birthday.day);
        return date.getMonth() === birthday.month - 1 ? date : new Date(year, 2, 1);
    };

    let next = target(today.getFullYear());
    if (next < today) next = target(today.getFullYear() + 1);
    return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function describeDays(days: number) {
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
}
