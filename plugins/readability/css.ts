/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ReadabilityOptions {
    /** Font family name, or undefined to keep Discord's font. */
    family?: string;
    /** Percent, 100 is normal. */
    fontScale: number;
    lineHeight: number;
    /** In em. */
    letterSpacing: number;
    /** In pixels, 0 means no limit. */
    maxWidth: number;
}

const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min);

/** Builds the stylesheet for message text. Numbers are clamped, so a bad setting cannot break the page. */
export function buildReadabilityCss(options: ReadabilityOptions) {
    const scale = clamp(options.fontScale, 50, 300);
    const lineHeight = clamp(options.lineHeight, 1, 3);
    const spacing = clamp(options.letterSpacing, 0, 0.5);
    const maxWidth = clamp(options.maxWidth, 0, 4000);

    const rules = [`line-height: ${lineHeight} !important;`];
    if (scale !== 100) rules.push(`font-size: ${scale}% !important;`);
    if (spacing) rules.push(`letter-spacing: ${spacing}em !important;`);
    if (maxWidth) rules.push(`max-width: ${maxWidth}px;`);
    // Family names come from a fixed list in the plugin, but quote them anyway.
    if (options.family) rules.push(`font-family: "${options.family.replace(/["\\]/g, "")}", var(--font-primary), sans-serif !important;`);

    return `[id^="message-content-"] {\n    ${rules.join("\n    ")}\n}\n`;
}
