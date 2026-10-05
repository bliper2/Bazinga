/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { addToCounts, EmojiCounts, topEmoji } from "./count";

const logger = bazingaLogger("EmojiUsageStats");
const STORE_KEY = "Bazinga_EmojiCounts";
const TOP = 20;

let counts: EmojiCounts = {};
const listeners = new Set<() => void>();

function Top() {
    const [, rerender] = useState(0);
    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);

    const top = topEmoji(counts, TOP);
    if (!top.length) return <Paragraph>No emoji counted yet. Send a message with an emoji to start.</Paragraph>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, color: "var(--text-default, var(--text-normal))" }}>
                {top.map(([emoji, count]) => (
                    <span key={emoji} style={{ padding: "2px 8px", borderRadius: 6, background: "var(--background-mod-subtle, rgb(128 128 128 / 20%))" }}>
                        {emoji} × {count}
                    </span>
                ))}
            </div>
            <div>
                <Button
                    size="small"
                    variant="dangerSecondary"
                    onClick={() => {
                        counts = {};
                        listeners.forEach(l => l());
                        DataStore.set(STORE_KEY, counts).catch(err => logger.error("Failed to reset", err));
                    }}
                >
                    Reset counts
                </Button>
            </div>
        </div>
    );
}

const settings = definePluginSettings({
    top: {
        type: OptionType.COMPONENT,
        description: "Your most used emoji",
        component: Top
    }
});

export default definePlugin({
    name: "EmojiUsageStats",
    description: "Counts the emoji in the messages you send and shows your favorites. The counts stay on this computer.",
    tags: ["Chat", "Fun"],
    searchTerms: ["emoji", "favorites", "most used", "statistics"],
    settings,

    onBeforeMessageSend(_channelId, message) {
        const next = addToCounts(counts, message.content);
        if (next === counts) return;
        counts = next;
        listeners.forEach(l => l());
        DataStore.set(STORE_KEY, counts).catch(err => logger.error("Failed to save counts", err));
    },

    async start() {
        try {
            counts = (await DataStore.get<EmojiCounts>(STORE_KEY)) ?? {};
        } catch (err) {
            logger.error("Failed to load counts", err);
        }
    }
});
