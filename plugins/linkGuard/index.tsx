/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Alerts } from "@webpack/common";

import { bazingaLogger, definePlugin, guard } from "../_bazinga";
import { checkLink } from "./analyze";

const logger = bazingaLogger("LinkGuard");

const settings = definePluginSettings({
    punycode: {
        type: OptionType.BOOLEAN,
        description: "Warn about addresses that use international characters to imitate other sites",
        default: true
    },
    lookalike: {
        type: OptionType.BOOLEAN,
        description: "Warn about addresses that imitate Discord, Steam, GitHub and other often-faked sites",
        default: true
    },
    mismatchedText: {
        type: OptionType.BOOLEAN,
        description: "Warn when a link's text shows a different site than the one it opens",
        default: true
    },
    ipAddress: {
        type: OptionType.BOOLEAN,
        description: "Warn about links to raw IP addresses",
        default: true
    },
    trustedDomains: {
        type: OptionType.STRING,
        description: "Domains that never trigger a warning, separated by commas (subdomains included)",
        default: ""
    }
});

// Set while the user has chosen "Open anyway", so our own re-dispatched click is let through.
let bypass = false;

function onLinkClick(e: MouseEvent) {
    if (bypass || (e.type === "auxclick" && e.button !== 1)) return;

    const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;

    const { store } = settings;
    const reasons = checkLink(anchor.href, anchor.textContent ?? "", {
        punycode: store.punycode,
        lookalike: store.lookalike,
        mismatchedText: store.mismatchedText,
        ipAddress: store.ipAddress,
        trustedDomains: store.trustedDomains.split(",").map(d => d.trim().toLowerCase()).filter(Boolean)
    });
    if (!reasons.length) return;

    // Stop Discord from opening the link until the user decides.
    e.preventDefault();
    e.stopImmediatePropagation();

    Alerts.show({
        title: "This link might not be what it seems",
        body: (
            <div style={{ display: "grid", gap: 8 }}>
                <ul style={{ listStyle: "disc", paddingLeft: 20 }}>
                    {reasons.map(r => <li key={r}>{r}</li>)}
                </ul>
                <code style={{ wordBreak: "break-all" }}>{anchor.href}</code>
            </div>
        ),
        confirmText: "Open anyway",
        cancelText: "Don't open",
        onConfirm: () => {
            bypass = true;
            try {
                anchor.click();
            } finally {
                bypass = false;
            }
        }
    });
}

const guardedClick = guard(logger, "Failed to check link", onLinkClick);

export default definePlugin({
    name: "LinkGuard",
    description: "Warns before you open links that imitate other sites, hide their real address or use raw IP addresses. Works offline.",
    tags: ["Privacy", "Chat"],
    searchTerms: ["phishing", "scam", "punycode", "safety", "link"],
    enabledByDefault: true,
    settings,

    start() {
        document.addEventListener("click", guardedClick, true);
        document.addEventListener("auxclick", guardedClick, true);
    },

    stop() {
        document.removeEventListener("click", guardedClick, true);
        document.removeEventListener("auxclick", guardedClick, true);
    }
});
