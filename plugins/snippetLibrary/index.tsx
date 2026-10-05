/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import * as DataStore from "@api/DataStore";
import { Button } from "@components/Button";
import { NotesIcon } from "@components/Icons";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, TextArea, TextInput, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";

const logger = bazingaLogger("SnippetLibrary");
const STORE_KEY = "Bazinga_Snippets";
const MAX_SNIPPETS = 100;

interface Snippet {
    id: string;
    name: string;
    text: string;
}

let snippets: Snippet[] = [];
const listeners = new Set<() => void>();

async function save(next: Snippet[]) {
    snippets = next;
    listeners.forEach(l => l());
    await DataStore.set(STORE_KEY, snippets);
}

function SnippetsModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const [, rerender] = useState(0);
    const [name, setName] = useState("");
    const [text, setText] = useState("");

    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);

    const add = () => {
        if (!name.trim() || !text.trim() || snippets.length >= MAX_SNIPPETS) return;
        save([...snippets, { id: `${Date.now()}`, name: name.trim(), text }]).catch(err => logger.error("Failed to save", err));
        setName("");
        setText("");
    };

    return (
        <Modal {...modalProps} size="md" title="Snippets" subtitle="Click a snippet to put it in the message box. You still press Enter to send.">
            <div className="bz-snippets">
                {snippets.length === 0 && <p className="bz-snippets-note">No snippets yet. Add one below.</p>}
                {snippets.map(s => (
                    <div key={s.id} className="bz-snippet">
                        <button
                            className="bz-snippet-use"
                            onClick={() => {
                                insertTextIntoChatInputBox(s.text);
                                modalProps.onClose();
                            }}
                        >
                            <strong>{s.name}</strong>
                            <span>{s.text}</span>
                        </button>
                        <Button size="small" variant="dangerSecondary" onClick={() => save(snippets.filter(x => x.id !== s.id))}>
                            Delete
                        </Button>
                    </div>
                ))}

                <div className="bz-snippet-new">
                    <TextInput value={name} onChange={setName} placeholder="Name" />
                    <TextArea value={text} onChange={setText} rows={3} placeholder="Text to insert" />
                    <Button size="small" disabled={!name.trim() || !text.trim()} onClick={add}>
                        Add snippet
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

const SnippetButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;
    return (
        <ChatBarButton tooltip="Snippets" onClick={() => openModal(props => <SnippetsModal modalProps={props} />)}>
            <NotesIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SnippetLibrary",
    description: "Save pieces of text you often write and put them in the message box with one click. It never sends anything for you.",
    tags: ["Chat", "Utility"],
    searchTerms: ["snippet", "template", "canned", "saved reply", "text"],

    chatBarButton: {
        icon: NotesIcon,
        render: SnippetButton
    },

    async start() {
        try {
            snippets = (await DataStore.get<Snippet[]>(STORE_KEY)) ?? [];
        } catch (err) {
            logger.error("Failed to load snippets", err);
            snippets = [];
        }
        listeners.forEach(l => l());
    }
});
