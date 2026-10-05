/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type EmojiCounts = Record<string, number>;

// Custom emoji look like <:name:123> or <a:name:123>. Others are Unicode emoji.
const CUSTOM = /<a?:(\w{2,32}):\d+>/g;
const UNICODE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu;

/** Emoji used in a message, one entry per use. Custom emoji are named like :name:. */
export function findEmoji(text: string): string[] {
    // Emoji inside code are examples, not use.
    const plain = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
    const found = [...plain.matchAll(CUSTOM)].map(m => `:${m[1]}:`);
    return found.concat(plain.replace(CUSTOM, " ").match(UNICODE) ?? []);
}

/** Returns new counts with the emoji of one message added. */
export function addToCounts(counts: EmojiCounts, text: string): EmojiCounts {
    const emoji = findEmoji(text);
    if (!emoji.length) return counts;

    const next = { ...counts };
    for (const e of emoji) next[e] = (next[e] ?? 0) + 1;
    return next;
}

export function topEmoji(counts: EmojiCounts, limit: number) {
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}
