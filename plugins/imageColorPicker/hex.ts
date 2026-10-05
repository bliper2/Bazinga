/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** #rrggbb for three channel values from 0 to 255. Values outside the range are pulled in. */
export function toHex(r: number, g: number, b: number) {
    const part = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, "0");
    return `#${part(r)}${part(g)}${part(b)}`;
}
