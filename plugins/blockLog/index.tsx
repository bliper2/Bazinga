/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";

const logger = bazingaLogger("BlockLog");

interface Blocked {
    total: number;
    recent: { time: number; host: string; path: string; }[];
}

function BlockedList() {
    const [data, setData] = useState<Blocked | null>(null);
    const [failed, setFailed] = useState(false);

    const refresh = () =>
        VesktopNative.bazinga
            .getBlockedRequests()
            .then(setData)
            .catch(err => {
                logger.warn("Could not read the block list", err);
                setFailed(true);
            });

    useEffect(() => {
        refresh();
    }, []);

    if (failed) return <Paragraph>This needs the Bazinga app, so it is not available here.</Paragraph>;
    if (!data) return <Paragraph>Loading…</Paragraph>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Paragraph>
                {data.total} tracking or crash-report requests blocked since Bazinga started
                {data.total > data.recent.length ? ` (showing the last ${data.recent.length})` : ""}.
            </Paragraph>
            <div style={{ maxHeight: 260, overflowY: "auto", fontFamily: "var(--font-code, monospace)", fontSize: 12, color: "var(--text-default, var(--text-normal))" }}>
                {data.recent.map((r, i) => (
                    <div key={i}>
                        {new Date(r.time).toLocaleTimeString()}  {r.host}{r.path}
                    </div>
                ))}
            </div>
            <div>
                <Button size="small" onClick={refresh}>Refresh</Button>
            </div>
        </div>
    );
}

const settings = definePluginSettings({
    log: {
        type: OptionType.COMPONENT,
        description: "Blocked requests",
        component: BlockedList
    }
});

export default definePlugin({
    name: "BlockLog",
    description: "Shows the tracking and crash-report requests that Bazinga blocked, so you can see it working.",
    tags: ["Privacy", "Developers"],
    searchTerms: ["telemetry", "tracking", "blocked", "analytics", "science"],
    settings
});
