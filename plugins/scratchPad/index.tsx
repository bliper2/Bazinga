/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { NotesIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, TextArea, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";

const logger = bazingaLogger("ScratchPad");
const STORE_KEY = "Bazinga_ScratchPad";
const SAVE_DELAY_MS = 400;

const settings = definePluginSettings({
    monospace: {
        type: OptionType.BOOLEAN,
        description: "Use a monospace font, handy for code",
        default: false
    }
});

let text = "";
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persist() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    DataStore.set(STORE_KEY, text).catch(err => logger.error("Failed to save", err));
}

function scheduleSave(value: string) {
    text = value;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, SAVE_DELAY_MS);
}

function ScratchPadModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const [value, setValue] = useState(text);
    const { monospace } = settings.use(["monospace"]);

    // Save right away when the pad closes, so nothing waits on the timer.
    useEffect(() => () => {
        if (saveTimer) persist();
    }, []);

    return (
        <Modal {...modalProps} size="lg" title="Scratch pad" subtitle="Saved automatically on this computer.">
            <div style={monospace ? { fontFamily: "var(--font-code, monospace)" } : undefined}>
                <TextArea
                    value={value}
                    onChange={v => {
                        setValue(v);
                        scheduleSave(v);
                    }}
                    rows={18}
                    placeholder="Jot anything down…"
                    autoFocus
                />
            </div>
        </Modal>
    );
}

const PadButton = ErrorBoundary.wrap(() => (
    <HeaderBarButton
        icon={NotesIcon}
        tooltip="Scratch pad"
        onClick={() => openModal(props => <ScratchPadModal modalProps={props} />)}
    />
), { noop: true });

export default definePlugin({
    name: "ScratchPad",
    description: "A notepad you can open from anywhere in Discord. Saved automatically and kept on this computer.",
    tags: ["Organisation", "Utility"],
    searchTerms: ["notes", "notepad", "scratch", "jot"],
    settings,

    toolboxActions: {
        "Open scratch pad": () => openModal(props => <ScratchPadModal modalProps={props} />)
    },

    headerBarButton: {
        icon: NotesIcon,
        render: () => <PadButton />
    },

    async start() {
        try {
            text = (await DataStore.get<string>(STORE_KEY)) ?? "";
        } catch (err) {
            logger.error("Failed to load", err);
        }
    },

    stop() {
        if (saveTimer) persist();
    }
});
