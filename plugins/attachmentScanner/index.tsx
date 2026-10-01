/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";

import { definePlugin } from "../_bazinga";
import { checkFileName } from "./check";

const settings = definePluginSettings({
    includeArchives: {
        type: OptionType.BOOLEAN,
        description: "Also warn about archives (.zip, .rar, .7z), which are often used to hide malware",
        default: false
    }
});

function Warning({ message }: { message: Message; }) {
    const flagged = message.attachments
        .map(a => ({ name: a.filename, reasons: checkFileName(a.filename, settings.store.includeArchives) }))
        .filter(f => f.reasons.length);
    if (!flagged.length) return null;

    return (
        <div className="bz-attachment-warning" role="alert">
            <strong>Be careful with {flagged.length === 1 ? "this file" : "these files"}</strong>
            <ul>
                {flagged.map(f => (
                    <li key={f.name}>
                        <code>{f.name}</code>: {f.reasons.join(" ")}
                    </li>
                ))}
            </ul>
            <span>Only open it if you trust the sender and expected this file.</span>
        </div>
    );
}

export default definePlugin({
    name: "AttachmentScanner",
    description: "Warns under messages with attachments that can run code on your computer or hide their real file type.",
    tags: ["Privacy", "Media"],
    searchTerms: ["malware", "virus", "exe", "attachment", "file"],
    enabledByDefault: true,
    settings,

    renderMessageAccessory: props => {
        const message = props.message as Message;
        return message.attachments?.length ? <Warning message={message} /> : null;
    }
});
