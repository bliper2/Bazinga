/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 YOUR NAME and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// A template for a Bazinga plugin. Copy this folder, rename it (folders that start with "_" are not loaded),
// then change the name and description below. See docs/WRITING_PLUGINS.md.

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { Menu, showToast, Toasts } from "@webpack/common";

import { bazingaLogger, definePlugin, guard } from "../_bazinga";
import { countWords } from "./logic";

const logger = bazingaLogger("ExamplePlugin");

// Every plugin needs at least one setting, so it gets a cog on the Plugins page.
const settings = definePluginSettings({
    minWords: {
        type: OptionType.NUMBER,
        description: "Only count messages with at least this many words",
        default: 1
    }
});

// Pieces of the page you add must be removed in stop(). Keep a handle to each one here.
let onKeyDown: ((e: KeyboardEvent) => void) | undefined;

// A right-click menu entry. The "message" menu gives you the message that was clicked.
const messageMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message) return;

    children.push(
        <Menu.MenuItem
            id="example-count-words"
            label="Count words"
            action={() => {
                const words = countWords(message.content ?? "");
                if (words >= settings.store.minWords) showToast(`${words} words`, Toasts.Type.MESSAGE);
            }}
        />
    );
};

export default definePlugin({
    // Keep `name` the first property and write it as a plain string: the build reads it from the source.
    name: "ExamplePlugin",
    description: "Counts the words in a message you right-click. Replace this with what your plugin does.",
    // Pick from the tags Equicord knows: Appearance, Chat, Privacy, Utility, Organisation, and so on.
    tags: ["Utility", "Chat"],
    searchTerms: ["example", "words"],
    // enabledByDefault: true,  // only for safety features that nearly everyone wants
    settings,

    contextMenus: {
        "message": messageMenuPatch
    },

    start() {
        // guard() logs errors from listeners instead of letting them break Discord.
        onKeyDown = guard(logger, "Key handler failed", (e: KeyboardEvent) => {
            if (e.key === "Escape") logger.info("Escape pressed");
        });
        document.addEventListener("keydown", onKeyDown, true);
    },

    stop() {
        // Undo everything start() did: listeners, timers, styles, elements.
        if (onKeyDown) document.removeEventListener("keydown", onKeyDown, true);
        onKeyDown = undefined;
    }
});
