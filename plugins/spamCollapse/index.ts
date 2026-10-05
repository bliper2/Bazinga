/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, guard, loadedMessages, messageFromElement, watchMessageContent } from "../_bazinga";
import managedStyle from "./styles.css?managed";

const logger = bazingaLogger("SpamCollapse");

const settings = definePluginSettings({
    withinSeconds: {
        type: OptionType.NUMBER,
        description: "Only treat a message as a repeat if it follows the first one within this many seconds",
        default: 120,
        onChange: () => watcher?.recheck()
    }
});

let watcher: ReturnType<typeof watchMessageContent> | undefined;

function check(el: HTMLElement) {
    if (el.dataset.bzSpam === "revealed") return;

    const message = messageFromElement(el);
    const text = message?.content?.trim().toLowerCase();
    if (!message || !text) return void delete el.dataset.bzSpam;

    const messages = loadedMessages(message.channel_id);
    const index = messages.findIndex(m => m.id === message.id);
    const previous = messages[index - 1];

    const repeat =
        previous &&
        previous.author.id === message.author.id &&
        previous.content.trim().toLowerCase() === text &&
        new Date(message.timestamp as unknown as string).getTime() - new Date(previous.timestamp as unknown as string).getTime() <=
            settings.store.withinSeconds * 1000;

    if (repeat) el.dataset.bzSpam = "repeat";
    else delete el.dataset.bzSpam;
}

const onClick = guard(logger, "Failed to reveal message", (e: MouseEvent) => {
    const repeat = (e.target as Element | null)?.closest<HTMLElement>('[data-bz-spam="repeat"]');
    if (!repeat) return;
    repeat.dataset.bzSpam = "revealed";
});

export default definePlugin({
    name: "SpamCollapse",
    description: "Folds a message into one faded line when the same person sends the exact same text again right after.",
    tags: ["Chat"],
    searchTerms: ["spam", "repeat", "duplicate", "flood"],
    settings,
    managedStyle,

    start() {
        watcher = watchMessageContent(logger, check);
        document.addEventListener("click", onClick, true);
    },

    stop() {
        watcher?.stop();
        watcher = undefined;
        document.removeEventListener("click", onClick, true);
        document.querySelectorAll<HTMLElement>("[data-bz-spam]").forEach(el => delete el.dataset.bzSpam);
    }
});
