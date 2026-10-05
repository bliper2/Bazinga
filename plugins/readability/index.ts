/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, loadFromCdn } from "../_bazinga";
import { buildReadabilityCss } from "./css";

const logger = bazingaLogger("Readability");

// Open fonts from the Fontsource project, loaded from jsDelivr and checked with Subresource Integrity.
const FONTS: Record<string, { family: string; url: string; integrity: string; }> = {
    lexend: {
        family: "Lexend",
        url: "https://cdn.jsdelivr.net/npm/@fontsource/lexend@5.3.0/400.css",
        integrity: "sha384-jFxpNb71Ito23sOvhn1ONWkNkrhv4GwDkXwcGep30H1JPJvuiOBOCLfA3JPC4o2+"
    },
    opendyslexic: {
        family: "OpenDyslexic",
        url: "https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.3.0/400.css",
        integrity: "sha384-q54Pv1Pvcisj2RoOLBsGRPR7exSBMDH+0DdHozGjUtdYRRNck247BH6yeN3iENbx"
    },
    atkinson: {
        family: "Atkinson Hyperlegible",
        url: "https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.3.0/400.css",
        integrity: "sha384-A+n77MhaWgh9YA2DMgsXAYDBUBWJd2iJAA3Jj1QNPvQIxjBxezYlSipvXNAn3KhV"
    }
};

const settings = definePluginSettings({
    font: {
        type: OptionType.SELECT,
        description: "Font for messages. Lexend and Atkinson Hyperlegible are made for easy reading; OpenDyslexic helps some people with dyslexia",
        options: [
            { label: "Discord's font", value: "default", default: true },
            { label: "Lexend", value: "lexend" },
            { label: "Atkinson Hyperlegible", value: "atkinson" },
            { label: "OpenDyslexic", value: "opendyslexic" }
        ],
        onChange: () => apply()
    },
    fontScale: {
        type: OptionType.SLIDER,
        description: "Message text size (percent)",
        markers: [80, 90, 100, 110, 125, 150, 175],
        default: 100,
        stickToMarkers: false,
        onChange: () => apply()
    },
    lineHeight: {
        type: OptionType.SLIDER,
        description: "Space between lines (1.375 is Discord's default)",
        markers: [1.2, 1.375, 1.5, 1.75, 2],
        default: 1.375,
        stickToMarkers: false,
        onChange: () => apply()
    },
    letterSpacing: {
        type: OptionType.SLIDER,
        description: "Space between letters (em, 0 is normal)",
        markers: [0, 0.02, 0.05, 0.08, 0.12],
        default: 0,
        stickToMarkers: false,
        onChange: () => apply()
    },
    maxWidth: {
        type: OptionType.NUMBER,
        description: "Narrowest line of text to allow, in pixels. Shorter lines are easier to read. 0 turns it off",
        default: 0,
        onChange: () => apply()
    }
});

let style: HTMLStyleElement | undefined;

async function apply() {
    if (!style) return;
    const { font, fontScale, lineHeight, letterSpacing, maxWidth } = settings.store;
    const choice = FONTS[font];

    if (choice) {
        try {
            await loadFromCdn(choice.url, choice.integrity);
        } catch (err) {
            logger.warn("Could not load the font", err);
        }
    }
    if (style) {
        style.textContent = buildReadabilityCss({
            family: choice?.family,
            fontScale,
            lineHeight,
            letterSpacing,
            maxWidth
        });
    }
}

export default definePlugin({
    name: "Readability",
    description: "Make messages easier to read: pick a reading font, text size, line spacing, letter spacing and line length.",
    tags: ["Accessibility", "Appearance"],
    searchTerms: ["dyslexia", "font", "text size", "line height", "spacing", "accessibility", "lexend"],
    settings,

    start() {
        style = document.createElement("style");
        style.id = "bazinga-readability";
        document.head.append(style);
        apply();
    },

    stop() {
        style?.remove();
        style = undefined;
    }
});
