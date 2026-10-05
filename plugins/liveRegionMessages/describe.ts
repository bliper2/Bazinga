/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface Speakable {
    content?: string;
    author?: { username: string; globalName?: string | null; };
    attachments?: { filename: string; }[];
    stickerItems?: unknown[];
    embeds?: unknown[];
}

/**
 * What a screen reader should say for a new message: "Ann: see you at 5". Mentions, custom emoji and links
 * are turned into words that are pleasant to hear. Returns an empty string when there is nothing to say.
 */
export function describeMessage(message: Speakable, maxLength: number) {
    const name = message.author?.globalName ?? message.author?.username ?? "Someone";

    const spoken = (message.content ?? "")
        .replace(/<a?:(\w+):\d+>/g, "$1 emoji")
        .replace(/<@!?\d+>/g, "a mention")
        .replace(/<@&\d+>/g, "a role mention")
        .replace(/<#\d+>/g, "a channel")
        .replace(/<t:\d+(?::\w)?>/g, "a time")
        .replace(/https?:\/\/\S+/g, "a link")
        .replace(/[*_~`|>]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const extras: string[] = [];
    const files = message.attachments?.length ?? 0;
    if (files) extras.push(files === 1 ? `attachment ${message.attachments![0].filename}` : `${files} attachments`);
    if (message.stickerItems?.length) extras.push("a sticker");

    const parts = [spoken.length > maxLength ? `${spoken.slice(0, maxLength)}…` : spoken, ...extras].filter(Boolean);
    return parts.length ? `${name}: ${parts.join(", ")}` : "";
}
