/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, guard } from "../_bazinga";
import managedStyle from "./styles.css?managed";

const logger = bazingaLogger("CollapseLong");

const CONTENT_SELECTOR = '[id^="message-content-"]';
const STATE = "bzCollapse";

const settings = definePluginSettings({
    maxLines: {
        type: OptionType.SLIDER,
        description: "Collapse messages taller than this many lines",
        markers: [5, 10, 15, 20, 30, 40],
        default: 15,
        stickToMarkers: false,
        onChange: () => {
            document.documentElement.style.setProperty("--bz-collapse-lines", String(settings.store.maxLines));
            recheckAll();
        }
    }
});

// Expanded messages stay expanded when Discord re-renders them.
const expanded = new Set<string>();
const pending = new Set<Element>();
let observer: MutationObserver | undefined;
let frame = 0;

function measure(el: HTMLElement) {
    if (expanded.has(el.id)) {
        el.dataset[STATE] = "expanded";
        return;
    }
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22;
    const tooTall = el.scrollHeight > lineHeight * settings.store.maxLines + lineHeight;
    if (tooTall) el.dataset[STATE] = "collapsed";
    else delete el.dataset[STATE];
}

const flush = guard(logger, "Failed to measure messages", () => {
    frame = 0;
    for (const root of pending) {
        if (!root.isConnected) continue;
        if (root.matches(CONTENT_SELECTOR)) measure(root as HTMLElement);
        root.querySelectorAll<HTMLElement>(CONTENT_SELECTOR).forEach(measure);
    }
    pending.clear();
});

function queue(root: Element) {
    pending.add(root);
    frame ||= requestAnimationFrame(flush);
}

function recheckAll() {
    document.querySelectorAll<HTMLElement>(CONTENT_SELECTOR).forEach(el => queue(el));
}

const onClick = guard(logger, "Failed to expand message", (e: MouseEvent) => {
    const target = e.target as Element | null;
    // Let links, spoilers, mentions and other controls inside the message work as usual.
    if (!target || target.closest("a, button, [role='button']")) return;

    const content = target.closest<HTMLElement>(`${CONTENT_SELECTOR}[data-bz-collapse="collapsed"]`);
    if (!content) return;

    expanded.add(content.id);
    content.dataset[STATE] = "expanded";
});

export default definePlugin({
    name: "CollapseLong",
    description: "Collapses very long messages. Click a collapsed message to expand it.",
    tags: ["Chat", "Appearance"],
    searchTerms: ["collapse", "long", "wall of text", "spoiler"],
    settings,
    managedStyle,

    start() {
        document.documentElement.style.setProperty("--bz-collapse-lines", String(settings.store.maxLines));

        observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node instanceof Element) queue(node);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        document.addEventListener("click", onClick, true);
        recheckAll();
    },

    stop() {
        observer?.disconnect();
        observer = undefined;
        cancelAnimationFrame(frame);
        frame = 0;
        pending.clear();
        document.removeEventListener("click", onClick, true);
        document.documentElement.style.removeProperty("--bz-collapse-lines");
        document.querySelectorAll<HTMLElement>("[data-bz-collapse]").forEach(el => delete el.dataset[STATE]);
    }
});
