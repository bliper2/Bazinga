/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, watchMessageContent } from "../_bazinga";
import { buildMatcher } from "../censor/matcher";

const logger = bazingaLogger("HighlightWords");

const HIGHLIGHT_NAME = "bz-highlight";
const PRUNE_MS = 30_000;

const settings = definePluginSettings({
    words: {
        type: OptionType.STRING,
        description: "Words or phrases to highlight, separated by commas",
        default: "",
        onChange: () => refresh()
    },
    color: {
        type: OptionType.STRING,
        description: "Highlight color (a color name or a code like #ffd54a)",
        default: "#ffd54a",
        isValid: (value: string) => CSS.supports("color", value) || "That is not a valid color",
        onChange: () => applyColor()
    },
    wholeWords: {
        type: OptionType.BOOLEAN,
        description: "Only match whole words",
        default: true,
        onChange: () => refresh()
    }
});

let watcher: ReturnType<typeof watchMessageContent> | undefined;
let style: HTMLStyleElement | undefined;
let pruneTimer: ReturnType<typeof setInterval> | undefined;
let matcher: RegExp | null = null;

// The CSS Custom Highlight API paints over text without changing the page, so Discord's own rendering is untouched.
const ranges = new Set<Range>();
const rangesByElement = new Map<HTMLElement, Range[]>();

function applyColor() {
    if (style) style.textContent = `::highlight(${HIGHLIGHT_NAME}) { background-color: ${settings.store.color}; color: #1a1a1a; }`;
}

function highlightElement(el: HTMLElement) {
    const highlight = CSS.highlights.get(HIGHLIGHT_NAME);
    if (!highlight) return;

    for (const old of rangesByElement.get(el) ?? []) {
        highlight.delete(old);
        ranges.delete(old);
    }
    rangesByElement.delete(el);
    if (!matcher) return;

    const mine: Range[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.nodeValue ?? "";
        for (const match of text.matchAll(matcher)) {
            if (match.index === undefined || !match[0]) continue;
            const range = new Range();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            highlight.add(range);
            ranges.add(range);
            mine.push(range);
        }
    }
    if (mine.length) rangesByElement.set(el, mine);
}

function clearAll() {
    CSS.highlights.get(HIGHLIGHT_NAME)?.clear();
    ranges.clear();
    rangesByElement.clear();
}

function refresh() {
    matcher = buildMatcher(settings.store.words, settings.store.wholeWords);
    clearAll();
    watcher?.recheck();
}

/** Drops highlights for messages that Discord has removed from the page. */
function prune() {
    const highlight = CSS.highlights.get(HIGHLIGHT_NAME);
    for (const [el, list] of rangesByElement) {
        if (el.isConnected) continue;
        for (const range of list) {
            highlight?.delete(range);
            ranges.delete(range);
        }
        rangesByElement.delete(el);
    }
}

export default definePlugin({
    name: "HighlightWords",
    description: "Highlights words you care about, such as your name or a topic, in every message. Only changes how it looks on your screen.",
    tags: ["Chat", "Utility"],
    searchTerms: ["highlight", "keyword", "mark", "color words"],
    settings,

    start() {
        if (!("highlights" in CSS)) {
            logger.warn("This version of Chromium cannot highlight text");
            return;
        }
        CSS.highlights.set(HIGHLIGHT_NAME, new Highlight());
        style = document.createElement("style");
        style.id = "bazinga-highlight-words";
        document.head.append(style);
        applyColor();

        matcher = buildMatcher(settings.store.words, settings.store.wholeWords);
        watcher = watchMessageContent(logger, highlightElement);
        pruneTimer = setInterval(prune, PRUNE_MS);
    },

    stop() {
        watcher?.stop();
        watcher = undefined;
        clearInterval(pruneTimer);
        if ("highlights" in CSS) CSS.highlights.delete(HIGHLIGHT_NAME);
        clearAll();
        style?.remove();
        style = undefined;
    }
});
