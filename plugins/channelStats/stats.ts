/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface StatMessage {
    authorId: string;
    authorName: string;
    /** Milliseconds since 1970. */
    time: number;
    length: number;
    attachments: number;
}

export interface ChannelStats {
    total: number;
    firstTime: number;
    lastTime: number;
    attachments: number;
    averageLength: number;
    /** Most active people first. */
    topPosters: { id: string; name: string; count: number; }[];
    /** Messages per hour of the day, local time, 24 entries. */
    byHour: number[];
}

export function computeStats(messages: StatMessage[], topCount = 10): ChannelStats {
    const posters = new Map<string, { id: string; name: string; count: number; }>();
    const byHour = Array<number>(24).fill(0);
    let attachments = 0;
    let characters = 0;
    let firstTime = Infinity;
    let lastTime = -Infinity;

    for (const message of messages) {
        const poster = posters.get(message.authorId) ?? { id: message.authorId, name: message.authorName, count: 0 };
        poster.count++;
        posters.set(message.authorId, poster);

        byHour[new Date(message.time).getHours()]++;
        attachments += message.attachments;
        characters += message.length;
        firstTime = Math.min(firstTime, message.time);
        lastTime = Math.max(lastTime, message.time);
    }

    return {
        total: messages.length,
        firstTime: messages.length ? firstTime : 0,
        lastTime: messages.length ? lastTime : 0,
        attachments,
        averageLength: messages.length ? Math.round(characters / messages.length) : 0,
        topPosters: [...posters.values()].sort((a, b) => b.count - a.count).slice(0, topCount),
        byHour
    };
}
