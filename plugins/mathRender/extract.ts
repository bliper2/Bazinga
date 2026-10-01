/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const MAX_EXPRESSIONS = 10;
const MAX_LENGTH = 2000;

const DISPLAY = /\$\$([\s\S]+?)\$\$/g;
// $…$ on one line, not touching another $ or a digit right after the opening $ (so "$5 and $10" is skipped).
const INLINE = /(?<![\\$])\$(?![\s\d$])([^$\n]+?)(?<!\s)\$(?![\d$])/g;

export interface MathExpression {
    tex: string;
    display: boolean;
}

/** Finds LaTeX in a message, ignoring anything inside code blocks or inline code. */
export function extractMath(content: string, includeInline: boolean): MathExpression[] {
    const text = content.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
    const found: MathExpression[] = [];

    for (const match of text.matchAll(DISPLAY)) {
        found.push({ tex: match[1].trim(), display: true });
    }
    if (includeInline) {
        for (const match of text.replace(DISPLAY, " ").matchAll(INLINE)) {
            found.push({ tex: match[1].trim(), display: false });
        }
    }

    return found.filter(e => e.tex && e.tex.length <= MAX_LENGTH).slice(0, MAX_EXPRESSIONS);
}
