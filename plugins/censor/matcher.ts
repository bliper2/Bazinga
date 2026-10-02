/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Builds one case-insensitive pattern for a comma-separated word list, or null when the list is empty. */
export function buildMatcher(list: string, wholeWords: boolean): RegExp | null {
    const words = list.split(",").map(w => w.trim()).filter(Boolean)
        // Longest first, so "bad word" wins over "bad".
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp);
    if (!words.length) return null;

    const body = words.join("|");
    // Unicode-aware word boundaries, so non-English words work too.
    return wholeWords
        ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${body})(?![\\p{L}\\p{N}_])`, "giu")
        : new RegExp(body, "giu");
}
