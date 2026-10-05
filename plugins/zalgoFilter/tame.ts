/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Keeps at most `maxMarks` combining marks after each letter and drops the rest.
 * Real languages never stack more than two or three marks, so this leaves them alone.
 */
export function tameCombiningMarks(text: string, maxMarks: number) {
    return text.replace(/(\P{M})(\p{M}+)/gu, (_, base: string, marks: string) => {
        const list = Array.from(marks);
        return list.length <= maxMarks ? base + marks : base + list.slice(0, maxMarks).join("");
    });
}
