/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { PaintbrushIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { removeFromArray } from "@utils/misc";
import { OptionType } from "@utils/types";
import { SettingsRouter } from "@webpack/common";

import { definePlugin } from "../_bazinga";
import { isHex } from "./studio";

const ENTRY_KEY = "bazinga_theme_studio";

const settings = definePluginSettings({
    accent: {
        type: OptionType.STRING,
        description: "Accent color for the orgeco themes and Theme Studio themes, like #ff66aa. Leave empty to use each theme's own accent",
        default: "",
        isValid: (value: string) => !value || isHex(value) || "Use a color code like #ff66aa",
        onChange: () => applyAccent()
    }
});

let style: HTMLStyleElement | undefined;

function applyAccent() {
    if (!style) return;
    const { accent } = settings.store;
    style.textContent = isHex(accent)
        ? `html:root { --bz-accent: ${accent}; --bz-accent-hover: color-mix(in srgb, ${accent} 80%, white); }`
        : "";
}

export default definePlugin({
    name: "ThemeStudio",
    description: "Make your own theme by picking colors with a live preview, and change the accent color of the orgeco themes in one place.",
    tags: ["Appearance", "Customisation"],
    searchTerms: ["theme", "editor", "colors", "accent", "create theme", "customize"],
    settings,
    toolboxActions: {
        "Open Theme Studio": () => SettingsRouter.openUserSettings(`${ENTRY_KEY}_panel`)
    },

    start() {
        style = document.createElement("style");
        style.id = "bazinga-accent-override";
        document.head.append(style);
        applyAccent();

        SettingsPlugin.customEntries.push({
            key: ENTRY_KEY,
            title: "Theme Studio",
            Component: require("./ThemeStudioPage").default,
            Icon: PaintbrushIcon
        });
    },

    stop() {
        style?.remove();
        style = undefined;
        document.getElementById("bazinga-studio-preview")?.remove();
        removeFromArray(SettingsPlugin.customEntries, e => e.key === ENTRY_KEY);
    }
});
