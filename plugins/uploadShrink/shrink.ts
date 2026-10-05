/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const SHRINKABLE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Smallest picture side worth producing. Below this the picture is no longer useful. */
export const MIN_SIDE = 320;

const SAFETY = 0.92;

/**
 * Picks the next size to try, as a share of the original width and height.
 * File size grows roughly with the number of pixels, so the share is the square root of the size ratio.
 * The result always gets smaller than `scale`, so repeating this ends.
 */
export function nextScale(currentBytes: number, limitBytes: number, scale: number) {
    const wanted = Math.sqrt(limitBytes / currentBytes) * SAFETY * scale;
    return Math.min(wanted, scale * 0.95);
}

/** Whether a file is worth offering to shrink: a supported picture that is over the limit. */
export function needsShrink(file: { type: string; size: number; }, limitBytes: number) {
    return SHRINKABLE_TYPES.includes(file.type) && file.size > limitBytes;
}
