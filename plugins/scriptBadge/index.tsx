/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { OptionType } from "@utils/types";

import { definePlugin } from "../_bazinga";
import { detectScript } from "./detect";

const settings = definePluginSettings({
    ignore: {
        type: OptionType.STRING,
        description: "Scripts you read, separated by commas. Messages in these get no tag (for example Latin, Cyrillic)",
        default: "Latin"
    }
});

const Badge = ErrorBoundary.wrap(({ content }: { content: string; }) => {
    const script = detectScript(content);
    if (!script) return null;

    const ignored = settings.store.ignore.split(",").map(s => s.trim().toLowerCase());
    if (ignored.includes(script.toLowerCase())) return null;

    return (
        <span style={{ marginLeft: 6, padding: "0 5px", borderRadius: 4, background: "var(--background-mod-strong, rgb(128 128 128 / 25%))", color: "var(--text-muted)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
            {script}
        </span>
    );
}, { noop: true });

export default definePlugin({
    name: "ScriptBadge",
    description: "Tags messages written in a writing system you do not read, such as Cyrillic or Arabic, so you know why you cannot read them.",
    tags: ["Chat", "Utility"],
    searchTerms: ["language", "script", "foreign", "cyrillic", "arabic", "cjk"],
    settings,

    renderMessageDecoration: ({ message }) => <Badge content={message.content ?? ""} />
});
