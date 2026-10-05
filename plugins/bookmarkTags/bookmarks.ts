/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Bookmark {
    messageId: string;
    channelId: string;
    /** Null for direct messages. */
    guildId: string | null;
    author: string;
    /** The start of the message, kept so the list still makes sense if the message is later deleted. */
    preview: string;
    tags: string[];
    savedAt: number;
}

export const MAX_PREVIEW = 300;
export const MAX_TAGS = 8;

/** Turns "Work, Ideas  to-read" into ["work", "ideas", "to-read"]. Commas and spaces both separate tags. */
export function parseTags(input: string): string[] {
    const tags = input
        .toLowerCase()
        .split(/[\s,#]+/)
        .map(tag => tag.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 24))
        .filter(Boolean);
    return [...new Set(tags)].slice(0, MAX_TAGS);
}

export function allTags(bookmarks: Bookmark[]) {
    const counts = new Map<string, number>();
    for (const b of bookmarks) for (const tag of b.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Newest first. `query` matches the text, author and tags; `tag` keeps only that tag. */
export function filterBookmarks(bookmarks: Bookmark[], query: string, tag: string | null) {
    const q = query.trim().toLowerCase();
    return bookmarks
        .filter(b => !tag || b.tags.includes(tag))
        .filter(b => !q || b.preview.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.tags.some(t => t.includes(q)))
        .sort((a, b) => b.savedAt - a.savedAt);
}

export const bookmarkLink = (b: Bookmark) => `https://discord.com/channels/${b.guildId ?? "@me"}/${b.channelId}/${b.messageId}`;

/** A Markdown list of bookmarks, for notes or sharing. */
export function bookmarksToMarkdown(bookmarks: Bookmark[]) {
    return bookmarks
        .map(b => {
            const tags = b.tags.length ? ` ${b.tags.map(t => `#${t}`).join(" ")}` : "";
            const text = b.preview.replace(/\s+/g, " ").trim() || "(no text)";
            return `- **${b.author}**: ${text} ([jump](${bookmarkLink(b)}))${tags}`;
        })
        .join("\n");
}
