/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import type { Message, RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Menu, MessageStore, Modal, NavigationRouter } from "@webpack/common";

import { definePlugin } from "../_bazinga";

const settings = definePluginSettings({
    maxDepth: {
        type: OptionType.NUMBER,
        description: "Most replies to follow up the chain",
        default: 25
    }
});

/**
 * Follows replies upward using only messages Discord has already loaded, so no extra requests are made.
 * Returns the chain oldest first and whether it stopped at a message that is not loaded.
 */
function buildChain(start: Message) {
    const chain = [start];
    let current = start;
    let truncated = false;

    while (current.messageReference && chain.length < settings.store.maxDepth) {
        const ref = current.messageReference;
        const parent = MessageStore.getMessage(ref.channel_id, ref.message_id);
        if (!parent) {
            truncated = true;
            break;
        }
        chain.push(parent);
        current = parent;
    }
    return { chain: chain.reverse(), truncated };
}

function jumpTo(message: Message) {
    const channel = ChannelStore.getChannel(message.channel_id);
    NavigationRouter.transitionTo(`/channels/${channel?.guild_id ?? "@me"}/${message.channel_id}/${message.id}`);
}

function ChainModal({ start, modalProps }: { start: Message; modalProps: RenderModalProps; }) {
    const { chain, truncated } = buildChain(start);

    return (
        <Modal {...modalProps} size="md" title="Reply chain" subtitle={`${chain.length} messages, oldest first. Click one to jump to it.`}>
            {truncated && (
                <p className="bz-chain-note">Earlier replies are not loaded. Scroll up in the channel and open this again to see more.</p>
            )}
            <div className="bz-chain">
                {chain.map(m => (
                    <button
                        key={m.id}
                        className={m.id === start.id ? "bz-chain-item bz-chain-current" : "bz-chain-item"}
                        onClick={() => {
                            jumpTo(m);
                            modalProps.onClose();
                        }}
                    >
                        <div className="bz-chain-head">
                            <strong>{m.author?.globalName ?? m.author?.username}</strong>
                            <span>{new Date(m.timestamp as unknown as string).toLocaleString()}</span>
                        </div>
                        <div className="bz-chain-text">{m.content || (m.attachments?.length ? "(attachment)" : "(no text)")}</div>
                    </button>
                ))}
            </div>
        </Modal>
    );
}

const messageMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message?.messageReference) return;
    children.push(
        <Menu.MenuItem
            id="bz-reply-chain"
            label="View reply chain"
            action={() => openModal(props => <ChainModal start={message} modalProps={props} />)}
        />
    );
};

export default definePlugin({
    name: "ReplyChainViewer",
    description: "Right-click a reply and choose View reply chain to see the whole conversation it answers in one place.",
    tags: ["Chat", "Utility"],
    searchTerms: ["reply", "thread", "chain", "conversation"],
    settings,

    contextMenus: {
        "message": messageMenuPatch
    }
});
