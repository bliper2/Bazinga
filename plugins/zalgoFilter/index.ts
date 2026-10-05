/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, watchMessageContent } from "../_bazinga";
import { tameCombiningMarks } from "./tame";

const logger = bazingaLogger("ZalgoFilter");

const settings = definePluginSettings({
    maxMarks: {
        type: OptionType.NUMBER,
        description: "Most accents to keep on one letter. Languages that need accents are not affected below 3",
        default: 2,
        isValid: (value: number) => (value >= 0 && value <= 10) || "Use a number from 0 to 10"
    }
});

let watcher: ReturnType<typeof watchMessageContent> | undefined;

function clean(el: HTMLElement) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.nodeValue;
        if (!text) continue;
        const fixed = tameCombiningMarks(text, settings.store.maxMarks);
        if (fixed !== text) node.nodeValue = fixed;
    }
}

export default definePlugin({
    name: "ZalgoFilter",
    description: "Tones down 'glitchy' text where dozens of accents are stacked on top of letters and spill over other messages.",
    tags: ["Chat", "Accessibility"],
    searchTerms: ["zalgo", "glitch", "cursed text", "combining", "accents"],
    settings,

    start() {
        watcher = watchMessageContent(logger, clean);
    },

    stop() {
        watcher?.stop();
        watcher = undefined;
    }
});
