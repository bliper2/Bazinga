/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { definePlugin } from "../_bazinga";
import { type Mode, MODES, svgMatrixValues } from "./matrix";

const SVG_ID = "bazinga-color-blind-filter";
const SVG_NS = "http://www.w3.org/2000/svg";

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "Help modes make colors you may confuse easier to tell apart. See-as modes show how someone with color blindness sees Discord",
        options: (Object.entries(MODES) as [Mode, string][]).map(([value, label]) => ({
            label,
            value,
            default: value === "help-deuteranopia"
        })),
        onChange: () => apply()
    }
});

let svg: SVGSVGElement | undefined;

function apply() {
    const mode = settings.store.mode as Mode;
    const matrix = svg?.querySelector("feColorMatrix");
    if (!svg || !matrix) return;

    matrix.setAttribute("values", svgMatrixValues(mode));
    // A filter on the page itself also covers pop-ups and menus.
    document.documentElement.style.filter = mode === "none" ? "" : `url(#${SVG_ID})`;
}

export default definePlugin({
    name: "ColorBlindModes",
    description: "Adjusts all colors in Discord for red-weak, green-weak and blue-weak vision, or shows you how they look to someone who has it.",
    tags: ["Accessibility", "Appearance"],
    searchTerms: ["color blind", "colour blind", "protanopia", "deuteranopia", "tritanopia", "daltonize", "accessibility"],
    settings,

    start() {
        svg = document.createElementNS(SVG_NS, "svg");
        svg.id = SVG_ID;
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        svg.style.cssText = "position:absolute;pointer-events:none;";
        svg.innerHTML = `<filter id="${SVG_ID}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>`;
        document.body.append(svg);
        apply();
    },

    stop() {
        document.documentElement.style.filter = "";
        svg?.remove();
        svg = undefined;
    }
});
