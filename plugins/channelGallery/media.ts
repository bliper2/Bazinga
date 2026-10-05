/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface GalleryMessage {
    id: string;
    attachments?: { url: string; proxy_url?: string; content_type?: string; filename: string; }[];
    embeds?: { type?: string; url?: string; image?: { url: string; proxy_url?: string; }; thumbnail?: { url: string; proxy_url?: string; }; video?: { url?: string; }; }[];
}

export interface MediaItem {
    messageId: string;
    kind: "image" | "video";
    /** Address of the full file. */
    url: string;
    /** Address to show in the grid. */
    preview: string;
    name: string;
}

const IMAGE_NAME = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;
const VIDEO_NAME = /\.(mp4|webm|mov|mkv|m4v)$/i;

/** All pictures and videos in the messages, newest message first, each file once. */
export function collectMedia(messages: GalleryMessage[]): MediaItem[] {
    const items: MediaItem[] = [];
    const seen = new Set<string>();

    const add = (item: MediaItem) => {
        if (seen.has(item.url)) return;
        seen.add(item.url);
        items.push(item);
    };

    for (const message of [...messages].reverse()) {
        for (const a of message.attachments ?? []) {
            const type = a.content_type ?? "";
            if (type.startsWith("image/") || IMAGE_NAME.test(a.filename)) {
                add({ messageId: message.id, kind: "image", url: a.url, preview: a.proxy_url ?? a.url, name: a.filename });
            } else if (type.startsWith("video/") || VIDEO_NAME.test(a.filename)) {
                add({ messageId: message.id, kind: "video", url: a.url, preview: a.proxy_url ?? a.url, name: a.filename });
            }
        }
        for (const embed of message.embeds ?? []) {
            const picture = embed.image ?? (embed.type === "image" || embed.type === "gifv" ? embed.thumbnail : undefined);
            if (picture) {
                add({ messageId: message.id, kind: "image", url: picture.url, preview: picture.proxy_url ?? picture.url, name: embed.url ?? "Embedded image" });
            }
        }
    }
    return items;
}
