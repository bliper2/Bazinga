/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChannelToolbarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { ImageIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Modal, NavigationRouter, SelectedChannelStore, useStateFromStores } from "@webpack/common";

import { definePlugin, loadedMessages } from "../_bazinga";
import { collectMedia, type GalleryMessage } from "./media";

function GalleryModal({ channelId, modalProps }: { channelId: string; modalProps: RenderModalProps; }) {
    const channel = ChannelStore.getChannel(channelId);
    const items = collectMedia(loadedMessages(channelId) as unknown as GalleryMessage[]);

    const open = (messageId: string) => {
        NavigationRouter.transitionTo(`/channels/${channel?.guild_id ?? "@me"}/${channelId}/${messageId}`);
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            size="lg"
            title={`Media in ${channel?.name ? `#${channel.name}` : "this chat"}`}
            subtitle={`${items.length} pictures and videos from the messages loaded now. Scroll up in the channel to include older ones. Click one to jump to its message.`}
        >
            {items.length === 0 ? (
                <p className="bz-gallery-note">No pictures or videos are loaded in this channel.</p>
            ) : (
                <div className="bz-gallery">
                    {items.map(item => (
                        <button key={item.url} className="bz-gallery-item" title={item.name} onClick={() => open(item.messageId)}>
                            {item.kind === "image" ? (
                                <img src={item.preview} alt={item.name} loading="lazy" />
                            ) : (
                                <video src={item.preview} preload="metadata" muted />
                            )}
                            {item.kind === "video" && <span className="bz-gallery-badge">Video</span>}
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
}

const GalleryButton = ErrorBoundary.wrap(() => {
    const channelId = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId());
    if (!channelId) return null;
    return (
        <ChannelToolbarButton
            icon={ImageIcon}
            tooltip="Channel gallery"
            onClick={() => openModal(props => <GalleryModal channelId={channelId} modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "ChannelGallery",
    description: "A grid of all the pictures and videos in a channel, from the messages you have loaded. No extra requests are made to find them.",
    tags: ["Media", "Chat"],
    searchTerms: ["gallery", "images", "photos", "media", "videos", "grid"],
    dependencies: ["HeaderBarAPI"],

    headerBarButton: {
        icon: ImageIcon,
        location: "channeltoolbar",
        priority: 7,
        render: () => <GalleryButton />
    }
});
