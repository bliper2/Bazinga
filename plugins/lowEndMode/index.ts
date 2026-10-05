/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { definePlugin } from "../_bazinga";
import managedStyle from "./styles.css?managed";

const settings = definePluginSettings({
    removeBlur: {
        type: OptionType.BOOLEAN,
        description: "Remove blur behind menus and popups (the most expensive effect)",
        default: true,
        onChange: () => apply()
    },
    removeShadows: {
        type: OptionType.BOOLEAN,
        description: "Remove drop shadows",
        default: true,
        onChange: () => apply()
    },
    removeAnimations: {
        type: OptionType.BOOLEAN,
        description: "Remove animations and transitions",
        default: true,
        onChange: () => apply()
    }
});

function apply(enabled = true) {
    const root = document.documentElement.classList;
    root.toggle("bz-low-blur", enabled && settings.store.removeBlur);
    root.toggle("bz-low-shadow", enabled && settings.store.removeShadows);
    root.toggle("bz-low-motion", enabled && settings.store.removeAnimations);
}

export default definePlugin({
    name: "LowEndMode",
    description: "Removes blur, shadows and animations to make Discord lighter on slow computers and laptops on battery.",
    tags: ["Appearance", "Utility"],
    searchTerms: ["performance", "slow", "battery", "lag", "animations", "blur"],
    settings,
    managedStyle,

    start: apply,
    stop: () => apply(false)
});
