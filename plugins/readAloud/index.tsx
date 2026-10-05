/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { Menu, showToast, Toasts } from "@webpack/common";

import { definePlugin } from "../_bazinga";
import { describeMessage } from "../liveRegionMessages/describe";

const settings = definePluginSettings({
    rate: {
        type: OptionType.SLIDER,
        description: "Speaking speed (1 is normal)",
        markers: [0.6, 0.8, 1, 1.2, 1.5, 2],
        default: 1,
        stickToMarkers: false
    },
    voiceName: {
        type: OptionType.STRING,
        description: "Voice to use, for example Microsoft Zira. Leave empty for your system's default voice",
        default: ""
    }
});

function speak(message: Message) {
    const text = describeMessage(message, 2000);
    if (!text) return void showToast("There is nothing to read in this message", Toasts.Type.MESSAGE);

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.store.rate;

    const wanted = settings.store.voiceName.trim().toLowerCase();
    const voice = wanted && speechSynthesis.getVoices().find(v => v.name.toLowerCase().includes(wanted));
    if (voice) utterance.voice = voice;

    speechSynthesis.speak(utterance);
}

const messageMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message) return;
    children.push(<Menu.MenuItem id="bz-read-aloud" label="Read aloud" action={() => speak(message)} />);
    if (speechSynthesis.speaking) {
        children.push(<Menu.MenuItem id="bz-read-stop" label="Stop reading" action={() => speechSynthesis.cancel()} />);
    }
};

export default definePlugin({
    name: "ReadAloud",
    description: "Right-click a message to have it read out loud by your computer's own voice. Nothing leaves your computer.",
    tags: ["Accessibility", "Chat"],
    searchTerms: ["read aloud", "text to speech", "tts", "speak", "voice"],
    settings,

    contextMenus: {
        "message": messageMenuPatch
    },

    stop() {
        speechSynthesis.cancel();
    }
});
