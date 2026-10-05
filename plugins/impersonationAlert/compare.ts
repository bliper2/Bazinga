/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { editDistance, skeleton } from "../linkGuard/analyze";

const MIN_LENGTH = 5;

/**
 * True when two names are different but would be easy to mix up: the same once look-alike characters are
 * folded together (rn and m, 0 and o), or one typo apart. Short names are skipped because many real names are close.
 */
export function looksLike(a: string, b: string) {
    if (a.toLowerCase() === b.toLowerCase()) return false;

    const x = skeleton(a);
    const y = skeleton(b);
    if (x.length < MIN_LENGTH || y.length < MIN_LENGTH) return false;

    return x === y || editDistance(x, y) <= 1;
}
