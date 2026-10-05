/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 YOUR NAME and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Put the logic that does not need Discord in its own file, with no imports from Discord or Equicord.
// Then it can be tested with `bun test`: see tests/template.test.ts for how.

/** How many words a text has. Links and code blocks are not counted. */
export function countWords(text: string) {
    const prose = text.replace(/```[\s\S]*?```/g, " ").replace(/https?:\/\/\S+/g, " ");
    return prose.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
}
