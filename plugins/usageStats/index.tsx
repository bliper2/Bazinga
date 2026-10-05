/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import { GuildStore, Modal, SelectedGuildStore, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { ChartIcon } from "../_bazinga/icons";
import { addUsage, dayKey, formatDuration, secondsToday, totalsForLast, type Usage } from "./usage";

const logger = bazingaLogger("UsageStats");
const STORE_KEY = "Bazinga_Usage";
const TICK_SECONDS = 10;
const SAVE_EVERY = 6;

const settings = definePluginSettings({
    dailyLimitMinutes: {
        type: OptionType.NUMBER,
        description: "Remind me once a day when I have spent this many minutes in Discord. 0 turns it off",
        default: 0
    }
});

let usage: Usage = {};
let timer: ReturnType<typeof setInterval> | undefined;
let ticks = 0;
let reminderDay = "";

function currentPlace() {
    return SelectedGuildStore.getGuildId() ?? "dm";
}

const placeName = (id: string) => (id === "dm" ? "Direct messages" : (GuildStore.getGuild(id)?.name ?? "A server you left"));

async function tick() {
    // Time only counts while the window is in front and you are looking at it.
    if (document.hidden || !document.hasFocus()) return;

    const now = new Date();
    usage = addUsage(usage, currentPlace(), TICK_SECONDS, now);
    if (++ticks % SAVE_EVERY === 0) await DataStore.set(STORE_KEY, usage);

    const limit = settings.store.dailyLimitMinutes;
    const today = dayKey(now);
    if (limit > 0 && reminderDay !== today && secondsToday(usage, now) >= limit * 60) {
        reminderDay = today;
        showNotification({
            title: "Time check",
            body: `You have spent ${formatDuration(secondsToday(usage, now))} in Discord today.`,
            permanent: true
        });
    }
}

function UsageModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const [days, setDays] = useState(7);
    const rows = totalsForLast(usage, days, new Date()).slice(0, 12);
    const max = Math.max(1, ...rows.map(r => r[1]));
    const total = rows.reduce((sum, r) => sum + r[1], 0);

    return (
        <Modal {...modalProps} size="md" title="Time in Discord" subtitle="Counted on this computer while the window is in front. Nothing is sent anywhere.">
            <div className="bz-usage-range">
                {[1, 7, 30].map(n => (
                    <Button key={n} size="small" variant={days === n ? "primary" : "secondary"} onClick={() => setDays(n)}>
                        {n === 1 ? "Today" : `Last ${n} days`}
                    </Button>
                ))}
            </div>
            {rows.length === 0 ? (
                <p className="bz-usage-note">Nothing recorded yet.</p>
            ) : (
                <div className="bz-usage">
                    <p className="bz-usage-note">Total: {formatDuration(total)}</p>
                    {rows.map(([place, seconds]) => (
                        <div key={place} className="bz-usage-row">
                            <span className="bz-usage-name">{placeName(place)}</span>
                            <span className="bz-usage-bar" style={{ width: `${(seconds / max) * 100}%` }} />
                            <span className="bz-usage-time">{formatDuration(seconds)}</span>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}

const UsageButton = ErrorBoundary.wrap(() => (
    <HeaderBarButton icon={ChartIcon} tooltip="Time in Discord" onClick={() => openModal(props => <UsageModal modalProps={props} />)} />
), { noop: true });

export default definePlugin({
    name: "UsageStats",
    description: "Shows how much time you spend in each server, counted on this computer while Discord is in front.",
    tags: ["Organisation", "Utility"],
    searchTerms: ["screen time", "usage", "time spent", "limit", "wellbeing"],
    settings,

    headerBarButton: {
        icon: ChartIcon,
        render: () => <UsageButton />
    },

    async start() {
        try {
            usage = (await DataStore.get<Usage>(STORE_KEY)) ?? {};
        } catch (err) {
            logger.error("Failed to load usage", err);
            usage = {};
        }
        timer = setInterval(() => tick().catch(err => logger.error("Failed to count time", err)), TICK_SECONDS * 1000);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
        DataStore.set(STORE_KEY, usage).catch(err => logger.error("Failed to save usage", err));
    }
});
