/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { copyToClipboard } from "@utils/clipboard";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts } from "@webpack/common";

import { definePlugin } from "../_bazinga";

const settings = definePluginSettings({
    includeLink: {
        type: OptionType.BOOLEAN,
        description: "Add a link back to the original message",
        default: true
    },
    includeDate: {
        type: OptionType.BOOLEAN,
        description: "Add the date the message was sent",
        default: false
    },
    includeAttachments: {
        type: OptionType.BOOLEAN,
        description: "List attachment links under the quote",
        default: true
    }
});

export function toMarkdown(message: Message) {
    const channel = ChannelStore.getChannel(message.channel_id);
    const author = message.author?.globalName ?? message.author?.username ?? "Unknown";
    const lines = message.content ? message.content.split("\n").map(l => `> ${l}`) : [];

    if (settings.store.includeAttachments) {
        for (const a of message.attachments ?? []) lines.push(`> [${a.filename}](${a.url})`);
    }

    const parts = [`— **${author}**`];
    if (settings.store.includeDate) parts.push(new Date(message.timestamp as unknown as string).toLocaleString());
    if (settings.store.includeLink) {
        parts.push(`[jump](https://discord.com/channels/${channel?.guild_id ?? "@me"}/${message.channel_id}/${message.id})`);
    }
    lines.push(parts.join(" · "));
    return lines.join("\n");
}

const messageMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message) return;
    children.push(
        <Menu.MenuItem
            id="bz-copy-as-markdown"
            label="Copy as Markdown"
            action={() => copyToClipboard(toMarkdown(message)).then(() => showToast("Copied as Markdown", Toasts.Type.SUCCESS))}
        />
    );
};

export default definePlugin({
    name: "CopyAsMarkdown",
    description: "Right-click a message to copy it as a Markdown quote with the author and a link back.",
    tags: ["Chat", "Utility"],
    searchTerms: ["copy", "quote", "markdown", "share"],
    settings,

    contextMenus: {
        "message": messageMenuPatch
    }
});
