/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { SelectedChannelStore, UserStore } from "@webpack/common";

import { definePlugin } from "../_bazinga";
import { describeMessage } from "./describe";

const CLEAR_AFTER_MS = 15_000;
const MAX_LENGTH = 300;

const settings = definePluginSettings({
    announceOwn: {
        type: OptionType.BOOLEAN,
        description: "Also announce the messages you send yourself",
        default: false
    },
    politeness: {
        type: OptionType.SELECT,
        description: "Polite waits until the screen reader is done talking. Assertive interrupts it",
        options: [
            { label: "Polite", value: "polite", default: true },
            { label: "Assertive", value: "assertive" }
        ],
        onChange: () => {
            region?.setAttribute("aria-live", settings.store.politeness);
        }
    }
});

let region: HTMLDivElement | undefined;

/** Hidden from view but read out by screen readers. */
const HIDDEN_STYLE = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;";

function announce(text: string) {
    if (!region) return;
    const line = document.createElement("div");
    line.textContent = text;
    region.append(line);
    setTimeout(() => line.remove(), CLEAR_AFTER_MS);
}

export default definePlugin({
    name: "LiveRegionMessages",
    description: "Makes screen readers read out new messages in the channel you are looking at, as they arrive.",
    tags: ["Accessibility", "Chat"],
    searchTerms: ["screen reader", "nvda", "jaws", "voiceover", "narrator", "announce", "aria"],
    settings,

    flux: {
        MESSAGE_CREATE({ message, channelId, optimistic }: { message: Message; channelId: string; optimistic?: boolean; }) {
            // `optimistic` messages are the copy shown while your own message is still being sent.
            if (optimistic || channelId !== SelectedChannelStore.getChannelId()) return;
            if (message.author?.id === UserStore.getCurrentUser()?.id && !settings.store.announceOwn) return;

            const text = describeMessage(message, MAX_LENGTH);
            if (text) announce(text);
        }
    },

    start() {
        region = document.createElement("div");
        region.setAttribute("aria-live", settings.store.politeness);
        region.setAttribute("aria-atomic", "false");
        region.setAttribute("role", "log");
        region.style.cssText = HIDDEN_STYLE;
        document.body.append(region);
    },

    stop() {
        region?.remove();
        region = undefined;
    }
});
