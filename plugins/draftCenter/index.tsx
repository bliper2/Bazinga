/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { PencilIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import {
    ChannelStore, DraftStore, DraftType, FluxDispatcher, GuildStore, Modal, NavigationRouter, UserStore, useStateFromStores
} from "@webpack/common";

import { definePlugin } from "../_bazinga";

const PREVIEW_LENGTH = 200;

const settings = definePluginSettings({
    hideWhenEmpty: {
        type: OptionType.BOOLEAN,
        description: "Hide the drafts button when you have no unsent drafts",
        default: true
    }
});

function useDrafts() {
    return useStateFromStores([DraftStore], () =>
        DraftStore.getRecentlyEditedDrafts(DraftType.ChannelMessage)
            .filter(d => d.draft?.trim())
            .sort((a, b) => b.timestamp - a.timestamp)
    );
}

function channelLabel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "Unknown channel";
    if (channel.guild_id) {
        const guild = GuildStore.getGuild(channel.guild_id);
        return `${guild?.name ?? "Server"} › #${channel.name}`;
    }
    if (channel.name) return channel.name;
    const recipient = UserStore.getUser(channel.recipients?.[0]);
    return recipient ? `@${recipient.username}` : "Direct message";
}

function openChannel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    NavigationRouter.transitionTo(`/channels/${channel?.guild_id ?? "@me"}/${channelId}`);
}

function discard(channelId: string) {
    FluxDispatcher.dispatch({ type: "DRAFT_CLEAR", channelId, draftType: DraftType.ChannelMessage });
}

function DraftsModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const drafts = useDrafts();

    return (
        <Modal {...modalProps} size="md" title="Unsent drafts" subtitle="Messages you started typing but did not send.">
            {drafts.length === 0 && <p className="bz-drafts-empty">No unsent drafts.</p>}
            <div className="bz-drafts">
                {drafts.map(d => (
                    <div key={d.channelId} className="bz-draft">
                        <div className="bz-draft-head">
                            <strong>{channelLabel(d.channelId)}</strong>
                            <span>{new Date(d.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="bz-draft-text">
                            {d.draft.length > PREVIEW_LENGTH ? `${d.draft.slice(0, PREVIEW_LENGTH)}…` : d.draft}
                        </div>
                        <div className="bz-draft-actions">
                            <Button size="small" onClick={() => { openChannel(d.channelId); modalProps.onClose(); }}>
                                Open
                            </Button>
                            <Button size="small" variant="dangerSecondary" onClick={() => discard(d.channelId)}>
                                Discard
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

const DraftsButton = ErrorBoundary.wrap(() => {
    const drafts = useDrafts();
    const { hideWhenEmpty } = settings.use(["hideWhenEmpty"]);
    if (hideWhenEmpty && !drafts.length) return null;

    return (
        <HeaderBarButton
            icon={PencilIcon}
            tooltip={drafts.length === 1 ? "1 unsent draft" : `${drafts.length} unsent drafts`}
            onClick={() => openModal(props => <DraftsModal modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "DraftCenter",
    description: "Lists every message you started typing but did not send, in any channel, so you can finish or discard it.",
    tags: ["Chat", "Organisation"],
    searchTerms: ["draft", "unsent", "typing"],
    settings,

    headerBarButton: {
        icon: PencilIcon,
        render: () => <DraftsButton />
    }
});
