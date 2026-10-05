/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface CalendarEvent {
    id: string;
    name: string;
    description?: string | null;
    /** ISO date text. */
    start: string;
    end?: string | null;
    location?: string | null;
    url: string;
}

const HOUR_MS = 60 * 60 * 1000;

/** Escapes text for an iCalendar value: backslash, semicolon, comma and line breaks. */
export function escapeText(text: string) {
    return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** 20261005T183000Z */
export function formatUtc(date: Date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Lines longer than 75 bytes continue on the next line, which starts with a space. */
export function foldLine(line: string) {
    const encoder = new TextEncoder();
    const parts: string[] = [];
    let current = "";
    let bytes = 0;

    for (const char of line) {
        const size = encoder.encode(char).length;
        // Continuation lines start with a space, which counts toward their length.
        const limit = parts.length ? 74 : 75;
        if (bytes + size > limit) {
            parts.push(current);
            current = "";
            bytes = 0;
        }
        current += char;
        bytes += size;
    }
    parts.push(current);
    return parts.join("\r\n ");
}

/** Builds a calendar file. Events without a valid start are skipped; without an end they last an hour. */
export function buildIcs(events: CalendarEvent[], now: Date) {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bazinga//Discord events//EN", "CALSCALE:GREGORIAN"];

    for (const event of events) {
        const start = new Date(event.start);
        if (Number.isNaN(start.getTime())) continue;
        const parsedEnd = event.end ? new Date(event.end) : null;
        const end = parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd : new Date(start.getTime() + HOUR_MS);

        lines.push(
            "BEGIN:VEVENT",
            `UID:${event.id}@bazinga`,
            `DTSTAMP:${formatUtc(now)}`,
            `DTSTART:${formatUtc(start)}`,
            `DTEND:${formatUtc(end)}`,
            `SUMMARY:${escapeText(event.name)}`
        );
        if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
        if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
        lines.push(`URL:${event.url}`, "END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    return lines.map(foldLine).join("\r\n") + "\r\n";
}
