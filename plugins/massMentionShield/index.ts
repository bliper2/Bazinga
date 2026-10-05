/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { bazingaLogger, definePlugin, guard, messageFromElement, watchMessageContent } from "../_bazinga";
import managedStyle from "./styles.css?managed";

const logger = bazingaLogger("MassMentionShield");

const settings = definePluginSettings({
    threshold: {
        type: OptionType.NUMBER,
        description: "Hide messages that mention at least this many people",
        default: 5,
        onChange: () => watcher?.recheck()
    },
    includeEveryone: {
        type: OptionType.BOOLEAN,
        description: "Also hide messages that use @everyone or @here",
        default: true,
        onChange: () => watcher?.recheck()
    }
});

let watcher: ReturnType<typeof watchMessageContent> | undefined;

function check(el: HTMLElement) {
    // A message the user has already opened stays open.
    if (el.dataset.bzMass === "revealed") return;

    const message = messageFromElement(el);
    const mentions = (message?.mentions?.length ?? 0) + (message?.mentionRoles?.length ?? 0);
    const everyone = settings.store.includeEveryone && !!message?.mentionEveryone;

    if (mentions >= settings.store.threshold || everyone) el.dataset.bzMass = "hidden";
    else delete el.dataset.bzMass;
}

const onClick = guard(logger, "Failed to reveal message", (e: MouseEvent) => {
    const target = e.target as Element | null;
    const hidden = target?.closest<HTMLElement>('[data-bz-mass="hidden"]');
    if (!hidden) return;

    e.preventDefault();
    e.stopPropagation();
    hidden.dataset.bzMass = "revealed";
});

export default definePlugin({
    name: "MassMentionShield",
    description: "Hides messages that mention many people or @everyone behind a click, so spam does not fill your screen.",
    tags: ["Chat", "Privacy"],
    searchTerms: ["mention", "spam", "everyone", "ping"],
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
        document.querySelectorAll<HTMLElement>("[data-bz-mass]").forEach(el => delete el.dataset.bzMass);
    }
});
