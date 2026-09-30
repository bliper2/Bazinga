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
import { stopPreview } from "./preview";

const ENTRY_KEY = "bazinga_betterdiscord_themes";

export const settings = definePluginSettings({
    defaultSort: {
        type: OptionType.SELECT,
        description: "How the theme list is sorted when you open it",
        options: [
            { label: "Most downloaded", value: "downloads", default: true },
            { label: "Most liked", value: "likes" },
            { label: "Recently updated", value: "released" },
            { label: "Name", value: "name" }
        ]
    }
});

export default definePlugin({
    name: "BetterDiscordThemes",
    description: "Browse, preview and install every theme from the BetterDiscord theme store.",
    tags: ["Appearance", "Customisation"],
    searchTerms: ["betterdiscord", "bd", "theme", "store"],
    enabledByDefault: true,
    settings,
    toolboxActions: {
        "Open BetterDiscord Themes": () => SettingsRouter.openUserSettings(`${ENTRY_KEY}_panel`)
    },

    start() {
        SettingsPlugin.customEntries.push({
            key: ENTRY_KEY,
            title: "BetterDiscord Themes",
            Component: require("./ThemeBrowser").default,
            Icon: PaintbrushIcon
        });
    },

    stop() {
        stopPreview();
        removeFromArray(SettingsPlugin.customEntries, e => e.key === ENTRY_KEY);
    }
});
