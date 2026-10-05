/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore, RelationshipStore, Tooltip, UserStore } from "@webpack/common";

import { definePlugin } from "../_bazinga";
import { looksLike } from "./compare";

const CACHE_MS = 60_000;

let friendNames: { id: string; names: string[]; label: string; }[] = [];
let builtAt = 0;

/** The names of your friends, rebuilt at most once a minute. Only users Discord has already loaded are known. */
function getFriends() {
    if (Date.now() - builtAt < CACHE_MS) return friendNames;
    builtAt = Date.now();

    friendNames = RelationshipStore.getFriendIDs().flatMap(id => {
        const user = UserStore.getUser(id);
        if (!user) return [];
        const names = [user.username, user.globalName].filter((n): n is string => !!n);
        return [{ id, names, label: user.globalName ?? user.username }];
    });
    return friendNames;
}

function findLookalike(message: Message) {
    const { author } = message;
    if (!author || author.id === UserStore.getCurrentUser()?.id || RelationshipStore.isFriend(author.id)) return null;

    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
    const nick = guildId ? GuildMemberStore.getNick(guildId, author.id) : null;
    const shown = [author.username, author.globalName, nick].filter((n): n is string => !!n);

    return getFriends().find(friend => friend.id !== author.id && shown.some(a => friend.names.some(b => looksLike(a, b)))) ?? null;
}

const Alert = ErrorBoundary.wrap(({ message }: { message: Message; }) => {
    const friend = findLookalike(message);
    if (!friend) return null;

    return (
        <Tooltip text={`This person is not your friend ${friend.label}. Their name only looks similar.`}>
            {props => <span {...props} className="bz-impersonation">Looks like {friend.label}</span>}
        </Tooltip>
    );
}, { noop: true });

export default definePlugin({
    name: "ImpersonationAlert",
    description: "Warns when someone's name looks almost the same as one of your friends' names, a common scam trick.",
    tags: ["Privacy", "Friends"],
    searchTerms: ["impersonate", "fake", "scam", "lookalike", "friend"],

    renderMessageDecoration: ({ message }) => <Alert message={message} />
});
