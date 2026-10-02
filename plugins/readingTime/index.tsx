/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Tooltip } from "@webpack/common";

import { definePlugin } from "../_bazinga";

const settings = definePluginSettings({
    minWords: {
        type: OptionType.NUMBER,
        description: "Only show reading time for messages with at least this many words",
        default: 120
    },
    wordsPerMinute: {
        type: OptionType.NUMBER,
        description: "Your reading speed in words per minute",
        default: 230
    }
});

export function countWords(text: string) {
    // Skip code blocks and links, which are skimmed rather than read.
    const prose = text.replace(/```[\s\S]*?```/g, " ").replace(/https?:\/\/\S+/g, " ");
    return prose.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

export default definePlugin({
    name: "ReadingTime",
    description: "Shows an estimated reading time next to long messages.",
    tags: ["Chat", "Utility"],
    searchTerms: ["read", "time", "long", "words"],
    settings,

    renderMessageDecoration: ({ message }) => {
        const words = countWords(message.content ?? "");
        if (words < settings.store.minWords) return null;
        const minutes = Math.max(1, Math.round(words / Math.max(1, settings.store.wordsPerMinute)));
        return (
            <Tooltip text={`${words} words`}>
                {props => (
                    <span {...props} style={{ marginLeft: 6, color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>
                        {minutes} min read
                    </span>
                )}
            </Tooltip>
        );
    }
});
