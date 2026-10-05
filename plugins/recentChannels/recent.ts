/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Puts the channel first and keeps at most `limit` channels, each once. */
export function pushRecent(list: string[], channelId: string, limit: number) {
    return [channelId, ...list.filter(id => id !== channelId)].slice(0, Math.max(1, limit));
}
