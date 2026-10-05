/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { OptionType } from "@utils/types";
import type { Guild } from "@vencord/discord-types";
import { ContextMenuApi, GuildStore, Menu, showToast, Toasts, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, interceptNotifications, setHiddenGuilds } from "../_bazinga";
import { TimerIcon } from "../_bazinga/icons";
import { formatRemaining, summarizeHeld } from "./session";

const logger = bazingaLogger("FocusSessions");
const ALLOW_KEY = "Bazinga_FocusAllowed";

const settings = definePluginSettings({
    minutes: {
        type: OptionType.SLIDER,
        description: "Length of a focus session",
        markers: [15, 25, 45, 60, 90],
        default: 25,
        stickToMarkers: false
    },
    holdNotifications: {
        type: OptionType.BOOLEAN,
        description: "Hold back desktop notifications during a session and show one summary at the end",
        default: true
    },
    hideServers: {
        type: OptionType.BOOLEAN,
        description: "Hide servers from the server list during a session, except the ones you keep visible (right-click a server)",
        default: true
    }
});

let endsAt: number | null = null;
let endTimer: ReturnType<typeof setTimeout> | undefined;
let stopHolding: (() => void) | undefined;
let held: string[] = [];
let allowed = new Set<string>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

function applyHiding() {
    if (endsAt && settings.store.hideServers) {
        setHiddenGuilds("focus", Object.keys(GuildStore.getGuilds()).filter(id => !allowed.has(id)));
    } else {
        setHiddenGuilds("focus", null);
    }
}

function stopSession(finished: boolean) {
    clearTimeout(endTimer);
    endTimer = undefined;
    stopHolding?.();
    stopHolding = undefined;
    endsAt = null;
    applyHiding();

    const summary = summarizeHeld(held);
    held = [];
    notify();

    showNotification({
        title: finished ? "Focus session finished" : "Focus session ended",
        body: summary ? `While you focused: ${summary}` : "Nothing came in while you focused.",
        permanent: true
    });
}

function startSession(minutes: number) {
    if (endsAt) return;

    endsAt = Date.now() + minutes * 60_000;
    held = [];
    if (settings.store.holdNotifications) {
        stopHolding = interceptNotifications(title => {
            held.push(title);
            return true;
        });
    }
    applyHiding();
    endTimer = setTimeout(() => stopSession(true), minutes * 60_000);
    notify();
    showToast(`Focus session started for ${minutes} minutes`, Toasts.Type.SUCCESS);
}

const guildMenuPatch: NavContextMenuPatchCallback = (children, props: { guild?: Guild; }) => {
    const { guild } = props;
    if (!guild) return;

    children.push(
        <Menu.MenuCheckboxItem
            id="bz-focus-keep"
            label="Keep visible during focus sessions"
            checked={allowed.has(guild.id)}
            action={() => {
                allowed = new Set(allowed);
                if (!allowed.delete(guild.id)) allowed.add(guild.id);
                DataStore.set(ALLOW_KEY, [...allowed]).catch(err => logger.error("Failed to save", err));
                applyHiding();
            }}
        />
    );
};

const FocusButton = ErrorBoundary.wrap(() => {
    const [now, setNow] = useState(Date.now());
    const [, rerender] = useState(0);

    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            listeners.delete(listener);
            clearInterval(timer);
        };
    }, []);

    const open = (e: React.MouseEvent) =>
        ContextMenuApi.openContextMenu(e, () => (
            <Menu.Menu navId="bz-focus" onClose={ContextMenuApi.closeContextMenu} aria-label="Focus session">
                {endsAt ? (
                    <Menu.MenuItem id="bz-focus-end" label="End session now" color="danger" action={() => stopSession(false)} />
                ) : (
                    [settings.store.minutes, 15, 25, 45, 60]
                        .filter((m, i, all) => all.indexOf(m) === i)
                        .map(m => <Menu.MenuItem key={m} id={`bz-focus-${m}`} label={`Focus for ${m} minutes`} action={() => startSession(m)} />)
                )}
            </Menu.Menu>
        ));

    return (
        <HeaderBarButton
            icon={TimerIcon}
            selected={!!endsAt}
            tooltip={endsAt ? `Focus: ${formatRemaining(endsAt - now)} left` : "Start a focus session"}
            onClick={open}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "FocusSessions",
    description: "A focus timer for working or studying: it holds back notifications and hides other servers until it ends.",
    tags: ["Organisation", "Notifications"],
    searchTerms: ["focus", "pomodoro", "timer", "study", "concentrate", "distraction"],
    settings,

    contextMenus: {
        "guild-context": guildMenuPatch
    },

    headerBarButton: {
        icon: TimerIcon,
        render: () => <FocusButton />
    },

    async start() {
        try {
            allowed = new Set((await DataStore.get<string[]>(ALLOW_KEY)) ?? []);
        } catch (err) {
            logger.error("Failed to load the list of visible servers", err);
        }
    },

    stop() {
        if (endsAt) stopSession(false);
    }
});
