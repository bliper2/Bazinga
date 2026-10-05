/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Writing systems that can be told apart with Unicode alone. This is the script, not the language. */
const SCRIPTS: [name: string, pattern: RegExp][] = [
    ["Cyrillic", /\p{Script=Cyrillic}/gu],
    ["Chinese characters", /\p{Script=Han}/gu],
    ["Japanese kana", /[\p{Script=Hiragana}\p{Script=Katakana}]/gu],
    ["Korean", /\p{Script=Hangul}/gu],
    ["Arabic", /\p{Script=Arabic}/gu],
    ["Hebrew", /\p{Script=Hebrew}/gu],
    ["Thai", /\p{Script=Thai}/gu],
    ["Devanagari", /\p{Script=Devanagari}/gu],
    ["Greek", /\p{Script=Greek}/gu],
    ["Latin", /\p{Script=Latin}/gu]
];

const MIN_LETTERS = 8;
const MAIN_SHARE = 0.6;

/** Returns the script most of a message's letters are written in, or null for short or mixed text. */
export function detectScript(text: string): string | null {
    // Links, mentions and custom emoji are not words in any language.
    const plain = text.replace(/https?:\/\/\S+|<[@#:a][^>]*>/g, " ");
    const letters = plain.match(/\p{L}/gu)?.length ?? 0;
    if (letters < MIN_LETTERS) return null;

    let best: [string, number] | null = null;
    for (const [name, pattern] of SCRIPTS) {
        const count = plain.match(pattern)?.length ?? 0;
        if (count && (!best || count > best[1])) best = [name, count];
    }
    return best && best[1] / letters >= MAIN_SHARE ? best[0] : null;
}
