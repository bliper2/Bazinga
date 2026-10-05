/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { OptionType } from "@utils/types";
import { ChannelStore, ContextMenuApi, Menu, NavigationRouter, SelectedChannelStore } from "@webpack/common";

import { bazingaLogger, channelLabel, definePlugin } from "../_bazinga";
import { HistoryIcon } from "../_bazinga/icons";
import { pushRecent } from "./recent";

const logger = bazingaLogger("RecentChannels");
const STORE_KEY = "Bazinga_RecentChannels";

const settings = definePluginSettings({
    count: {
        type: OptionType.SLIDER,
        description: "How many recent channels to remember",
        markers: [5, 10, 15, 20],
        default: 10,
        stickToMarkers: false
    }
});

let recent: string[] = [];

function remember(channelId: string | null | undefined) {
    if (!channelId) return;
    recent = pushRecent(recent, channelId, settings.store.count);
    DataStore.set(STORE_KEY, recent).catch(err => logger.error("Failed to save", err));
}

function go(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    NavigationRouter.transitionTo(`/channels/${channel?.guild_id ?? "@me"}/${channelId}`);
}

const RecentButton = ErrorBoundary.wrap(() => {
    const open = (e: React.MouseEvent) =>
        ContextMenuApi.openContextMenu(e, () => {
            // The channel you are in now is not worth jumping to.
            const items = recent.filter(id => id !== SelectedChannelStore.getChannelId() && ChannelStore.getChannel(id));
            return (
                <Menu.Menu navId="bz-recent" onClose={ContextMenuApi.closeContextMenu} aria-label="Recent channels">
                    {items.length ? (
                        items.map(id => <Menu.MenuItem key={id} id={`bz-recent-${id}`} label={channelLabel(id)} action={() => go(id)} />)
                    ) : (
                        <Menu.MenuItem id="bz-recent-none" label="No recent channels yet" disabled />
                    )}
                </Menu.Menu>
            );
        });

    return <HeaderBarButton icon={HistoryIcon} tooltip="Recent channels" onClick={open} />;
}, { noop: true });

export default definePlugin({
    name: "RecentChannels",
    description: "A title-bar menu with the channels you visited last, so you can jump back with one click.",
    tags: ["Organisation", "Utility"],
    searchTerms: ["recent", "history", "back", "last channels", "jump"],
    settings,

    headerBarButton: {
        icon: HistoryIcon,
        render: () => <RecentButton />
    },

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId?: string | null; }) {
            remember(channelId);
        }
    },

    async start() {
        try {
            recent = (await DataStore.get<string[]>(STORE_KEY)) ?? [];
        } catch (err) {
            logger.error("Failed to load recent channels", err);
        }
        remember(SelectedChannelStore.getChannelId());
    }
});
