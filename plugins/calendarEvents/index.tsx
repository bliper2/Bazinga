/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import type { Guild } from "@vencord/discord-types";
import { GuildScheduledEventStore, Menu, showToast, Toasts } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { buildIcs } from "./ics";

const logger = bazingaLogger("CalendarEvents");

interface ScheduledEvent {
    id: string;
    name: string;
    description?: string | null;
    scheduled_start_time: string;
    scheduled_end_time?: string | null;
    entity_metadata?: { location?: string | null; } | null;
}

function download(fileName: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function exportEvents(guild: Guild) {
    try {
        const events = (GuildScheduledEventStore.getGuildScheduledEventsForGuild(guild.id) ?? []) as unknown as ScheduledEvent[];
        if (!events.length) return void showToast(`${guild.name} has no scheduled events`, Toasts.Type.MESSAGE);

        const ics = buildIcs(
            events.map(e => ({
                id: e.id,
                name: e.name,
                description: e.description,
                start: e.scheduled_start_time,
                end: e.scheduled_end_time,
                location: e.entity_metadata?.location,
                url: `https://discord.com/events/${guild.id}/${e.id}`
            })),
            new Date()
        );
        download(`${guild.name.replace(/[^\p{L}\p{N}_ -]/gu, "").trim() || "server"}-events.ics`, ics);
    } catch (err) {
        logger.error("Failed to export events", err);
        showToast("Could not export the events", Toasts.Type.FAILURE);
    }
}

const guildMenuPatch: NavContextMenuPatchCallback = (children, props: { guild?: Guild; }) => {
    if (props.guild) {
        children.push(<Menu.MenuItem id="bz-export-events" label="Export events to calendar" action={() => exportEvents(props.guild!)} />);
    }
};

export default definePlugin({
    name: "CalendarEvents",
    description: "Right-click a server to save its scheduled events as a calendar file (.ics) you can open in any calendar app.",
    tags: ["Servers", "Utility"],
    searchTerms: ["calendar", "events", "ics", "schedule", "export"],

    contextMenus: {
        "guild-context": guildMenuPatch
    }
});
