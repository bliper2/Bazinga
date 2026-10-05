/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { copyToClipboard } from "@utils/clipboard";
import { openModal } from "@utils/modal";
import type { Message, RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Menu, Modal, NavigationRouter, showToast, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { BookmarkIcon } from "../_bazinga/icons";
import {
    allTags,
    type Bookmark,
    bookmarksToMarkdown,
    filterBookmarks,
    MAX_PREVIEW,
    parseTags
} from "./bookmarks";

const logger = bazingaLogger("BookmarkTags");
const STORE_KEY = "Bazinga_Bookmarks";
const MAX_BOOKMARKS = 1000;

let bookmarks: Bookmark[] = [];
const listeners = new Set<() => void>();

async function save(next: Bookmark[]) {
    bookmarks = next;
    listeners.forEach(l => l());
    await DataStore.set(STORE_KEY, bookmarks);
}

function useBookmarks() {
    const [, rerender] = useState(0);
    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);
    return bookmarks;
}

function AddModal({ message, modalProps }: { message: Message; modalProps: RenderModalProps; }) {
    const existing = bookmarks.find(b => b.messageId === message.id);
    const [tags, setTags] = useState(existing?.tags.join(" ") ?? "");

    const submit = () => {
        const bookmark: Bookmark = {
            messageId: message.id,
            channelId: message.channel_id,
            guildId: ChannelStore.getChannel(message.channel_id)?.guild_id ?? null,
            author: message.author?.globalName ?? message.author?.username ?? "Unknown",
            preview: (message.content || (message.attachments?.length ? `(${message.attachments[0].filename})` : "")).slice(0, MAX_PREVIEW),
            tags: parseTags(tags),
            savedAt: existing?.savedAt ?? Date.now()
        };
        save([...bookmarks.filter(b => b.messageId !== message.id), bookmark].slice(-MAX_BOOKMARKS))
            .then(() => showToast("Bookmarked", Toasts.Type.SUCCESS))
            .catch(err => logger.error("Failed to save bookmark", err));
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            size="sm"
            title={existing ? "Edit bookmark" : "Bookmark this message"}
            subtitle="Add tags to find it later. Separate them with spaces or commas."
            actions={[{ text: "Save", variant: "primary", onClick: submit }]}
        >
            <TextInput value={tags} onChange={setTags} placeholder="work, ideas, to-read" autoFocus />
        </Modal>
    );
}

function BookmarksModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const list = useBookmarks();
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState<string | null>(null);
    const shown = filterBookmarks(list, query, tag);

    const open = (b: Bookmark) => {
        NavigationRouter.transitionTo(`/channels/${b.guildId ?? "@me"}/${b.channelId}/${b.messageId}`);
        modalProps.onClose();
    };

    return (
        <Modal {...modalProps} size="md" title="Bookmarks" subtitle={`${list.length} saved. They stay on this computer.`}>
            <TextInput value={query} onChange={setQuery} placeholder="Search text, authors or tags" />
            <div className="bz-bm-tags">
                {allTags(list).map(([name, count]) => (
                    <button key={name} className={tag === name ? "bz-bm-tag bz-bm-tag-on" : "bz-bm-tag"} onClick={() => setTag(tag === name ? null : name)}>
                        #{name} {count}
                    </button>
                ))}
            </div>
            <div className="bz-bm-list">
                {!shown.length && <p className="bz-bm-note">{list.length ? "Nothing matches." : "No bookmarks yet. Right-click a message and choose Bookmark."}</p>}
                {shown.map(b => (
                    <div key={b.messageId} className="bz-bm">
                        <button className="bz-bm-open" onClick={() => open(b)}>
                            <strong>{b.author}</strong>
                            <span>{b.preview || "(no text)"}</span>
                            {b.tags.length > 0 && <small>{b.tags.map(t => `#${t}`).join(" ")}</small>}
                        </button>
                        <Button size="small" variant="dangerSecondary" onClick={() => save(bookmarks.filter(x => x.messageId !== b.messageId))}>
                            Remove
                        </Button>
                    </div>
                ))}
            </div>
            {shown.length > 0 && (
                <div className="bz-bm-actions">
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => copyToClipboard(bookmarksToMarkdown(shown)).then(() => showToast("Copied as Markdown", Toasts.Type.SUCCESS))}
                    >
                        Copy shown as Markdown
                    </Button>
                </div>
            )}
        </Modal>
    );
}

const messageMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message) return;
    const saved = bookmarks.some(b => b.messageId === message.id);
    children.push(
        <Menu.MenuItem
            id="bz-bookmark"
            label={saved ? "Edit bookmark" : "Bookmark"}
            action={() => openModal(props => <AddModal message={message} modalProps={props} />)}
        />
    );
};

const BookmarksButton = ErrorBoundary.wrap(() => {
    const count = useBookmarks().length;
    return (
        <HeaderBarButton
            icon={BookmarkIcon}
            tooltip={`Bookmarks (${count})`}
            onClick={() => openModal(props => <BookmarksModal modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "BookmarkTags",
    description: "Right-click a message to bookmark it with tags, then search and filter your bookmarks and export them as Markdown.",
    tags: ["Organisation", "Chat"],
    searchTerms: ["bookmark", "save message", "tags", "favorites", "read later"],

    contextMenus: {
        "message": messageMenuPatch
    },

    headerBarButton: {
        icon: BookmarkIcon,
        render: () => <BookmarksButton />
    },

    async start() {
        try {
            bookmarks = (await DataStore.get<Bookmark[]>(STORE_KEY)) ?? [];
        } catch (err) {
            logger.error("Failed to load bookmarks", err);
            bookmarks = [];
        }
        listeners.forEach(l => l());
    }
});
