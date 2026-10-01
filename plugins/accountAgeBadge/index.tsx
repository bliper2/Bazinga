/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { OptionType } from "@utils/types";
import type { User } from "@vencord/discord-types";
import { SnowflakeUtils, Tooltip } from "@webpack/common";

import { definePlugin } from "../_bazinga";

const DAY_MS = 24 * 60 * 60 * 1000;

const settings = definePluginSettings({
    maxAgeDays: {
        type: OptionType.NUMBER,
        description: "Mark accounts younger than this many days",
        default: 30
    },
    inMemberList: {
        type: OptionType.BOOLEAN,
        description: "Also show the badge in the member list",
        default: true
    },
    includeBots: {
        type: OptionType.BOOLEAN,
        description: "Also mark new bot accounts",
        default: false
    }
});

function formatAge(days: number) {
    if (days < 1) return "today";
    if (days < 14) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
}

const Badge = ErrorBoundary.wrap(({ user }: { user: User | undefined; }) => {
    if (!user?.id || (user.bot && !settings.store.includeBots)) return null;

    const created = SnowflakeUtils.extractTimestamp(user.id);
    const days = Math.floor((Date.now() - created) / DAY_MS);
    if (days >= settings.store.maxAgeDays) return null;

    return (
        <Tooltip text={`Account created ${new Date(created).toLocaleString()}`}>
            {props => <span {...props} className="bz-new-account">New · {formatAge(days)}</span>}
        </Tooltip>
    );
}, { noop: true });

export default definePlugin({
    name: "AccountAgeBadge",
    description: "Marks accounts created recently, a common sign of spam and scam accounts.",
    tags: ["Privacy", "Chat"],
    searchTerms: ["new account", "spam", "scam", "age", "created"],
    settings,

    renderMessageDecoration: ({ message }) => <Badge user={message.author} />,
    renderMemberListDecorator: ({ user }) => (settings.store.inMemberList ? <Badge user={user} /> : null)
});
