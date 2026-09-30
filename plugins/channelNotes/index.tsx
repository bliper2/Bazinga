/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { ChannelToolbarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { NotesIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Modal, SelectedChannelStore, TextArea, useEffect, useState, useStateFromStores } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";

const logger = bazingaLogger("ChannelNotes");
const STORE_KEY = "Bazinga_ChannelNotes";
const PREVIEW_LENGTH = 120;

const settings = definePluginSettings({
    previewInTooltip: {
        type: OptionType.BOOLEAN,
        description: "Show the start of the note when you hover the notes button",
        default: true
    }
});

// Notes stay on this computer only, keyed by channel ID.
let notes: Record<string, string> = {};
const listeners = new Set<() => void>();

async function loadNotes() {
    try {
        notes = (await DataStore.get<Record<string, string>>(STORE_KEY)) ?? {};
    } catch (err) {
        logger.error("Failed to load notes", err);
        notes = {};
    }
    listeners.forEach(l => l());
}

async function saveNote(channelId: string, text: string) {
    const next = { ...notes };
    if (text.trim()) next[channelId] = text;
    else delete next[channelId];

    notes = next;
    listeners.forEach(l => l());
    await DataStore.set(STORE_KEY, notes);
}

function useNote(channelId: string | undefined) {
    const [, rerender] = useState(0);
    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);
    return channelId ? notes[channelId] ?? "" : "";
}

function channelLabel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "this channel";
    return channel.name ? `#${channel.name}` : "this conversation";
}

function NotesModal({ channelId, modalProps }: { channelId: string; modalProps: RenderModalProps; }) {
    const [text, setText] = useState(notes[channelId] ?? "");

    const save = () => {
        saveNote(channelId, text)
            .catch(err => logger.error("Failed to save note", err))
            .finally(modalProps.onClose);
    };

    return (
        <Modal
            {...modalProps}
            size="md"
            title={`Notes for ${channelLabel(channelId)}`}
            subtitle="Only you can see these notes. They are stored on this computer."
            actions={[
                { text: "Save", variant: "primary", onClick: save },
                { text: "Clear", variant: "secondary", onClick: () => setText("") }
            ]}
        >
            <TextArea value={text} onChange={setText} rows={10} placeholder="Write a note…" autoFocus />
        </Modal>
    );
}

const NotesButton = ErrorBoundary.wrap(() => {
    const channelId = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId());
    const note = useNote(channelId);
    if (!channelId) return null;

    const tooltip = note && settings.store.previewInTooltip
        ? note.length > PREVIEW_LENGTH ? `${note.slice(0, PREVIEW_LENGTH)}â€¦` : note
        : note ? "Channel notes" : "Add a channel note";

    return (
        <ChannelToolbarButton
            icon={NotesIcon}
            tooltip={tooltip}
            aria-label="Channel notes"
            selected={!!note}
            onClick={() => openModal(props => <NotesModal channelId={channelId} modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "ChannelNotes",
    description: "Keep private notes for any channel or DM. Adds a notes button to the channel toolbar.",
    tags: ["Organisation", "Utility"],
    searchTerms: ["notes", "memo", "channel"],
    dependencies: ["HeaderBarAPI"],
    settings,

    headerBarButton: {
        icon: NotesIcon,
        location: "channeltoolbar",
        priority: 10,
        render: () => <NotesButton />
    },

    start: loadNotes
});
