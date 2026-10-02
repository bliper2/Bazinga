/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, watchMessageContent } from "../_bazinga";
import { buildMatcher } from "./matcher";

const logger = bazingaLogger("Censor");

const settings = definePluginSettings({
    words: {
        type: OptionType.STRING,
        description: "Words or phrases to hide, separated by commas",
        default: "",
        onChange: () => refresh()
    },
    wholeWords: {
        type: OptionType.BOOLEAN,
        description: "Only match whole words, so hiding \"ass\" does not change \"class\"",
        default: true,
        onChange: () => refresh()
    },
    replacement: {
        type: OptionType.STRING,
        description: "What to show instead. Leave empty to show one • per letter",
        default: "",
        onChange: () => refresh()
    }
});

let matcher: RegExp | null = null;
let watcher: ReturnType<typeof watchMessageContent> | undefined;

function refresh() {
    matcher = buildMatcher(settings.store.words, settings.store.wholeWords);
    watcher?.recheck();
}

function censorElement(el: HTMLElement) {
    if (!matcher) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.nodeValue;
        if (!text) continue;
        matcher.lastIndex = 0;
        if (!matcher.test(text)) continue;
        // Only the text on this screen changes; the message itself is untouched.
        node.nodeValue = text.replace(matcher, match => settings.store.replacement || "•".repeat(match.length));
    }
}

export default definePlugin({
    name: "Censor",
    description: "Hides words and phrases you choose in messages, on your screen only.",
    tags: ["Chat", "Privacy"],
    searchTerms: ["filter", "hide words", "censor", "profanity", "spoiler"],
    settings,

    start() {
        matcher = buildMatcher(settings.store.words, settings.store.wholeWords);
        watcher = watchMessageContent(logger, censorElement);
    },

    stop() {
        watcher?.stop();
        watcher = undefined;
        matcher = null;
    }
});
