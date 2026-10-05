/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HeaderBarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { InfoIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal } from "@webpack/common";

import { definePlugin } from "../_bazinga";

const ROWS: [what: string, write: string][] = [
    ["Bold", "**bold**"],
    ["Italic", "*italic*  or  _italic_"],
    ["Underline", "__underline__"],
    ["Strikethrough", "~~strikethrough~~"],
    ["Spoiler", "||hidden text||"],
    ["Inline code", "`code`"],
    ["Code block", "```js\nconsole.log(1)\n```"],
    ["Quote", "> quoted line"],
    ["Block quote", ">>> everything after this"],
    ["Heading", "# Big   ## Medium   ### Small"],
    ["Small text", "-# small text"],
    ["Bulleted list", "- item"],
    ["Numbered list", "1. item"],
    ["Link with a name", "[name](https://example.com)"],
    ["Hide link preview", "<https://example.com>"],
    ["Time that adapts to each reader", "<t:1700000000:R>"],
    ["Mention a channel", "<#channelId>"],
    ["Stop formatting", "\\*not italic\\*"]
];

function CheatsheetModal({ modalProps }: { modalProps: RenderModalProps; }) {
    return (
        <Modal {...modalProps} size="md" title="Formatting cheatsheet" subtitle="What to type in a message.">
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 20px", paddingBottom: 12, color: "var(--text-default, var(--text-normal))" }}>
                {ROWS.map(([what, write]) => (
                    <div key={what} style={{ display: "contents" }}>
                        <span>{what}</span>
                        <code style={{ whiteSpace: "pre-wrap" }}>{write}</code>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

const open = () => openModal(props => <CheatsheetModal modalProps={props} />);

const Button = ErrorBoundary.wrap(() => <HeaderBarButton icon={InfoIcon} tooltip="Formatting cheatsheet" onClick={open} />, { noop: true });

export default definePlugin({
    name: "MarkdownCheatsheet",
    description: "A quick reference for Discord's text formatting, one click away in the title bar.",
    tags: ["Chat", "Utility"],
    searchTerms: ["markdown", "formatting", "help", "bold", "spoiler", "timestamp"],
    toolboxActions: {
        "Formatting cheatsheet": open
    },

    headerBarButton: {
        icon: InfoIcon,
        render: () => <Button />
    }
});
