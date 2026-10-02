/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChannelToolbarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { MagnifyingGlassIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Modal, NavigationRouter, RestAPI, SelectedChannelStore, TextInput, useEffect, useMemo, useState, useStateFromStores } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";

const logger = bazingaLogger("PinSearch");

// Discord allows up to 250 pins per channel; 5 pages of 50 covers them all.
const PAGE_SIZE = 50;
const MAX_PAGES = 5;

interface PinnedMessage {
    id: string;
    content: string;
    timestamp: string;
    author: { username: string; global_name?: string | null; };
    attachments?: { filename: string; }[];
}

/** Loads the channel's pins the same way Discord does when you open the pins popout, one page at a time. */
async function loadPins(channelId: string): Promise<PinnedMessage[]> {
    const pins: PinnedMessage[] = [];
    let before: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
        const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (before) query.set("before", before);
        const { body } = await RestAPI.get({ url: `/channels/${channelId}/messages/pins?${query}` });
        const items: { pinned_at: string; message: PinnedMessage; }[] = body?.items ?? [];
        pins.push(...items.map(i => i.message));
        if (!body?.has_more || !items.length) break;
        before = items[items.length - 1].pinned_at;
    }
    return pins;
}

function PinsModal({ channelId, modalProps }: { channelId: string; modalProps: RenderModalProps; }) {
    const [pins, setPins] = useState<PinnedMessage[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
        loadPins(channelId).then(setPins).catch(err => {
            logger.error("Failed to load pins", err);
            setError("Could not load pinned messages.");
        });
    }, [channelId]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!pins || !q) return pins ?? [];
        return pins.filter(p =>
            p.content.toLowerCase().includes(q)
            || (p.author.global_name ?? p.author.username).toLowerCase().includes(q)
            || p.attachments?.some(a => a.filename.toLowerCase().includes(q)));
    }, [pins, query]);

    const open = (id: string) => {
        const channel = ChannelStore.getChannel(channelId);
        NavigationRouter.transitionTo(`/channels/${channel?.guild_id ?? "@me"}/${channelId}/${id}`);
        modalProps.onClose();
    };

    return (
        <Modal {...modalProps} size="md" title="Search pinned messages">
            <TextInput value={query} onChange={setQuery} placeholder="Search text, authors or file names" autoFocus />
            <div className="bz-pins">
                {error && <p className="bz-pins-note">{error}</p>}
                {!error && !pins && <p className="bz-pins-note">Loading pins…</p>}
                {pins && !visible.length && <p className="bz-pins-note">{pins.length ? "No pins match." : "This channel has no pins."}</p>}
                {visible.map(p => (
                    <button key={p.id} className="bz-pin" onClick={() => open(p.id)}>
                        <div className="bz-pin-head">
                            <strong>{p.author.global_name ?? p.author.username}</strong>
                            <span>{new Date(p.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="bz-pin-text">{p.content || p.attachments?.map(a => a.filename).join(", ") || "(no text)"}</div>
                    </button>
                ))}
            </div>
        </Modal>
    );
}

const PinsButton = ErrorBoundary.wrap(() => {
    const channelId = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId());
    if (!channelId) return null;
    return (
        <ChannelToolbarButton
            icon={MagnifyingGlassIcon}
            tooltip="Search pinned messages"
            onClick={() => openModal(props => <PinsModal channelId={channelId} modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "PinSearch",
    description: "Adds a button to search a channel's pinned messages by text, author or file name.",
    tags: ["Chat", "Utility"],
    searchTerms: ["pins", "pinned", "search", "find"],
    dependencies: ["HeaderBarAPI"],

    headerBarButton: {
        icon: MagnifyingGlassIcon,
        location: "channeltoolbar",
        priority: 9,
        render: () => <PinsButton />
    }
});
