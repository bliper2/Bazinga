/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, NavigationRouter, showToast, Toasts, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, guard } from "../_bazinga";

const logger = bazingaLogger("Reminders");
const STORE_KEY = "Bazinga_Reminders";
const CHECK_MS = 30_000;
const PREVIEW_LENGTH = 120;

interface Reminder {
    id: string;
    channelId: string;
    guildId: string | null;
    messageId: string;
    author: string;
    preview: string;
    due: number;
}

let reminders: Reminder[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

async function save(next: Reminder[]) {
    reminders = next;
    listeners.forEach(l => l());
    await DataStore.set(STORE_KEY, reminders);
}

function messageLink(r: Reminder) {
    return `/channels/${r.guildId ?? "@me"}/${r.channelId}/${r.messageId}`;
}

function add(message: Message, due: number) {
    const channel = ChannelStore.getChannel(message.channel_id);
    const reminder: Reminder = {
        id: `${message.id}-${due}`,
        channelId: message.channel_id,
        guildId: channel?.guild_id ?? null,
        messageId: message.id,
        author: message.author?.globalName ?? message.author?.username ?? "Someone",
        preview: message.content.slice(0, PREVIEW_LENGTH),
        due
    };
    save([...reminders, reminder].sort((a, b) => a.due - b.due))
        .then(() => showToast(`Reminder set for ${new Date(due).toLocaleString()}`, Toasts.Type.SUCCESS))
        .catch(err => logger.error("Failed to save reminder", err));
}

const checkDue = guard(logger, "Failed to check reminders", () => {
    const now = Date.now();
    const due = reminders.filter(r => r.due <= now);
    if (!due.length) return;

    for (const r of due) {
        showNotification({
            title: `Reminder: message from ${r.author}`,
            body: r.preview || "(no text)",
            permanent: true,
            onClick: () => NavigationRouter.transitionTo(messageLink(r))
        });
    }
    save(reminders.filter(r => r.due > now)).catch(err => logger.error("Failed to save reminders", err));
});

function tomorrowAt(hour: number) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
}

const CHOICES: [string, () => number][] = [
    ["In 20 minutes", () => Date.now() + 20 * 60_000],
    ["In 1 hour", () => Date.now() + 60 * 60_000],
    ["In 3 hours", () => Date.now() + 3 * 60 * 60_000],
    ["Tomorrow at 9:00", () => tomorrowAt(9)],
    ["In 1 week", () => Date.now() + 7 * 24 * 60 * 60_000]
];

const messageMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message) return;
    children.push(
        <Menu.MenuItem id="bz-remind-me" label="Remind me">
            {CHOICES.map(([label, when]) => (
                <Menu.MenuItem key={label} id={`bz-remind-${label}`} label={label} action={() => add(message, when())} />
            ))}
        </Menu.MenuItem>
    );
};

function ReminderList() {
    const [, rerender] = useState(0);
    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);

    if (!reminders.length) return <p style={{ color: "var(--text-muted)" }}>No reminders. Right-click a message and choose Remind me.</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reminders.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-default, var(--text-normal))" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div><strong>{new Date(r.due).toLocaleString()}</strong> · {r.author}</div>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                            {r.preview || "(no text)"}
                        </div>
                    </div>
                    <Button
                        size="small"
                        variant="dangerSecondary"
                        onClick={() => save(reminders.filter(x => x.id !== r.id))}
                    >
                        Remove
                    </Button>
                </div>
            ))}
        </div>
    );
}

const settings = definePluginSettings({
    list: {
        type: OptionType.COMPONENT,
        description: "Upcoming reminders",
        component: ReminderList
    }
});

export default definePlugin({
    name: "Reminders",
    description: "Right-click a message and choose Remind me to get a notification about it later. Reminders stay on this computer.",
    tags: ["Organisation", "Notifications"],
    searchTerms: ["remind", "later", "todo", "notification"],
    settings,

    contextMenus: {
        "message": messageMenuPatch
    },

    async start() {
        try {
            reminders = (await DataStore.get<Reminder[]>(STORE_KEY)) ?? [];
        } catch (err) {
            logger.error("Failed to load reminders", err);
            reminders = [];
        }
        listeners.forEach(l => l());
        // Reminders that came due while Discord was closed fire right away.
        checkDue();
        timer = setInterval(checkDue, CHECK_MS);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
    }
});
