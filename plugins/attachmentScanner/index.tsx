/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";

import { bazingaLogger, confirmDialog, definePlugin, guard } from "../_bazinga";
import { checkFileName, isExecutableName } from "./check";

const logger = bazingaLogger("AttachmentScanner");

const settings = definePluginSettings({
    includeArchives: {
        type: OptionType.BOOLEAN,
        description: "Also warn about archives (.zip, .rar, .7z), which are often used to hide malware",
        default: false
    },
    confirmDownload: {
        type: OptionType.BOOLEAN,
        description: "Ask before downloading a file that can run code",
        default: true
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

// Set while the user has chosen "Download anyway", so the re-sent click is let through.
let bypass = false;

function attachmentName(anchor: HTMLAnchorElement) {
    try {
        const url = new URL(anchor.href);
        if (!/^(cdn|media)\.discordapp\.(com|net)$/.test(url.hostname) || !url.pathname.startsWith("/attachments/")) return null;
        return decodeURIComponent(url.pathname.split("/").pop() ?? "");
    } catch {
        return null;
    }
}

const onClick = guard(logger, "Failed to check download", (e: MouseEvent) => {
    if (bypass || !settings.store.confirmDownload) return;

    const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    const name = anchor && attachmentName(anchor);
    if (!anchor || !name || !isExecutableName(name)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    confirmDialog({
        title: "Download this file?",
        body: `${name} can run programs on your computer. Only download it if you trust the sender and expected it.`,
        confirmText: "Download anyway",
        cancelText: "Cancel"
    }).then(choice => {
        if (choice !== "confirm") return;
        bypass = true;
        try {
            anchor.click();
        } finally {
            bypass = false;
        }
    });
});

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
    },

    start() {
        document.addEventListener("click", onClick, true);
    },

    stop() {
        document.removeEventListener("click", onClick, true);
    }
});
