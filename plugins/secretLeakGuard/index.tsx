/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { confirmDialog, definePlugin } from "../_bazinga";
import { findSecrets, isSensitiveFileName } from "./patterns";

const settings = definePluginSettings({
    checkCards: {
        type: OptionType.BOOLEAN,
        description: "Also warn about payment card numbers",
        default: true
    },
    checkFiles: {
        type: OptionType.BOOLEAN,
        description: "Also warn about files that usually hold secrets, like .env files and private keys",
        default: true
    },
    checkPasswords: {
        type: OptionType.BOOLEAN,
        description: 'Also warn about text like "password: hunter2"',
        default: true
    }
});

export default definePlugin({
    name: "SecretLeakGuard",
    description: "Asks before you send a message that looks like it contains a password, API key, token or card number. Checks only your own outgoing text, on this computer.",
    tags: ["Privacy", "Chat"],
    searchTerms: ["password", "api key", "token", "leak", "secret"],
    enabledByDefault: true,
    settings,

    async onBeforeMessageSend(_channelId, message, options) {
        const found = findSecrets(message.content, {
            cards: settings.store.checkCards,
            passwords: settings.store.checkPasswords
        });
        if (settings.store.checkFiles) {
            for (const upload of options.uploads ?? []) {
                if (isSensitiveFileName(upload.filename)) found.push(`a file that usually holds secrets (${upload.filename})`);
            }
        }
        if (!found.length) return;

        const choice = await confirmDialog({
            title: "This message might contain a secret",
            body: (
                <div>
                    <p>It looks like it contains:</p>
                    <ul style={{ listStyle: "disc", paddingLeft: 20, margin: "8px 0" }}>
                        {found.map(kind => <li key={kind}>{kind}</li>)}
                    </ul>
                    <p>Anyone who can read this channel will be able to use it.</p>
                </div>
            ),
            confirmText: "Send anyway",
            cancelText: "Don't send"
        });
        if (choice !== "confirm") return { cancel: true };
    }
});
