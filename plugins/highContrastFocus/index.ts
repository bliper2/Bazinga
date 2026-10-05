/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { definePlugin } from "../_bazinga";

const settings = definePluginSettings({
    color: {
        type: OptionType.STRING,
        description: "Outline color (a color name or a code like #ffcc00)",
        default: "#ffcc00",
        isValid: (value: string) => CSS.supports("color", value) || "That is not a valid color",
        onChange: () => apply()
    },
    thickness: {
        type: OptionType.SLIDER,
        description: "Outline thickness in pixels",
        markers: [2, 3, 4, 5, 6],
        default: 3,
        stickToMarkers: false,
        onChange: () => apply()
    }
});

let style: HTMLStyleElement | undefined;

function apply() {
    if (!style) return;
    const { color, thickness } = settings.store;
    // Only the keyboard focus gets the outline, so clicking with the mouse looks the same as before.
    style.textContent = `:focus-visible {
    outline: ${Math.max(1, Math.min(10, Number(thickness) || 3))}px solid ${color} !important;
    outline-offset: 2px !important;
}`;
}

export default definePlugin({
    name: "HighContrastFocus",
    description: "Draws a clear outline around whatever has the keyboard focus, so you can always see where you are when using Tab.",
    tags: ["Accessibility", "Appearance"],
    searchTerms: ["focus", "outline", "keyboard", "tab", "contrast", "accessibility"],
    settings,

    start() {
        style = document.createElement("style");
        style.id = "bazinga-focus-outline";
        document.head.append(style);
        apply();
    },

    stop() {
        style?.remove();
        style = undefined;
    }
});
