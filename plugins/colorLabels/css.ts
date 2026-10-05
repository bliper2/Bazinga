/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** The colors a label can have. Only these values ever reach the stylesheet. */
export const LABEL_COLORS: Record<string, string> = {
    Red: "#ed4245",
    Orange: "#f57c00",
    Yellow: "#f0b232",
    Green: "#23a55a",
    Teal: "#1abc9c",
    Blue: "#3b82f6",
    Purple: "#9b59b6",
    Pink: "#eb459e"
};

export interface Labels {
    /** Server id to color. */
    guilds: Record<string, string>;
    /** Channel id to color. */
    channels: Record<string, string>;
}

const ALLOWED = new Set(Object.values(LABEL_COLORS));
const isId = (id: string) => /^\d+$/.test(id);

/** Builds the stylesheet for all labels. Ids and colors from stored data are checked before use. */
export function buildLabelCss(labels: Labels) {
    const rules: string[] = [];

    for (const [id, color] of Object.entries(labels.guilds)) {
        if (!isId(id) || !ALLOWED.has(color)) continue;
        const item = `[data-list-item-id="guildsnav___${id}"]`;
        rules.push(
            `${item} { position: relative; }`,
            `${item}::after { content: ""; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border: 2px solid var(--background-base-lowest, #1e1f22); border-radius: 50%; background: ${color}; pointer-events: none; }`
        );
    }

    for (const [id, color] of Object.entries(labels.channels)) {
        if (!isId(id) || !ALLOWED.has(color)) continue;
        rules.push(`[data-list-item-id="channels___${id}"], [data-list-item-id="channels___${id}"] * { color: ${color} !important; }`);
    }

    return rules.join("\n");
}
