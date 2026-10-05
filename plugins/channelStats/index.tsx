/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChannelToolbarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { ClockIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Modal, SelectedChannelStore, useStateFromStores } from "@webpack/common";

import { definePlugin, loadedMessages } from "../_bazinga";
import { computeStats } from "./stats";

function StatsModal({ channelId, modalProps }: { channelId: string; modalProps: RenderModalProps; }) {
    const channel = ChannelStore.getChannel(channelId);
    const messages = loadedMessages(channelId);
    const stats = computeStats(
        messages.map(m => ({
            authorId: m.author.id,
            authorName: m.author.globalName ?? m.author.username,
            time: new Date(m.timestamp as unknown as string).getTime(),
            length: m.content?.length ?? 0,
            attachments: m.attachments?.length ?? 0
        }))
    );
    const maxPosts = Math.max(1, ...stats.topPosters.map(p => p.count));
    const maxHour = Math.max(1, ...stats.byHour);

    return (
        <Modal
            {...modalProps}
            size="md"
            title={`Activity in ${channel?.name ? `#${channel.name}` : "this chat"}`}
            subtitle={`Based on the ${stats.total} messages loaded now. Scroll up in the channel to include older ones.`}
        >
            {stats.total === 0 ? (
                <p className="bz-stats-note">No messages are loaded in this channel.</p>
            ) : (
                <div className="bz-stats">
                    <p className="bz-stats-note">
                        {new Date(stats.firstTime).toLocaleString()} to {new Date(stats.lastTime).toLocaleString()} · average {stats.averageLength} characters ·{" "}
                        {stats.attachments} attachments
                    </p>

                    <h4>Most active</h4>
                    {stats.topPosters.map(p => (
                        <div key={p.id} className="bz-stats-row">
                            <span className="bz-stats-name">{p.name}</span>
                            <span className="bz-stats-bar" style={{ width: `${(p.count / maxPosts) * 100}%` }} />
                            <span className="bz-stats-count">{p.count}</span>
                        </div>
                    ))}

                    <h4>Messages by hour of the day</h4>
                    <div className="bz-stats-hours">
                        {stats.byHour.map((count, hour) => (
                            <div key={hour} className="bz-stats-hour" title={`${hour}:00 - ${count} messages`}>
                                <span style={{ height: `${(count / maxHour) * 100}%` }} />
                                <small>{hour % 6 === 0 ? hour : ""}</small>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}

const StatsButton = ErrorBoundary.wrap(() => {
    const channelId = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId());
    if (!channelId) return null;
    return (
        <ChannelToolbarButton
            icon={ClockIcon}
            tooltip="Channel activity"
            onClick={() => openModal(props => <StatsModal channelId={channelId} modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "ChannelStats",
    description: "Shows who is most active in a channel and when, from the messages you have loaded. Nothing is sent anywhere.",
    tags: ["Chat", "Utility"],
    searchTerms: ["statistics", "activity", "top posters", "analytics"],
    dependencies: ["HeaderBarAPI"],

    headerBarButton: {
        icon: ClockIcon,
        location: "channeltoolbar",
        priority: 8,
        render: () => <StatsButton />
    }
});
