/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Button } from "@components/Button";
import { copyToClipboard } from "@utils/clipboard";
import { openModal } from "@utils/modal";
import type { PluginNative } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import { Menu, Modal, showToast, Toasts } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { checkLink } from "../linkGuard/analyze";
import type { ExpandResult } from "./native";

const Native = VencordNative.pluginHelpers.ShortenerExpander as PluginNative<typeof import("./native")>;
const logger = bazingaLogger("ShortenerExpander");

const KNOWN = /^(www\.)?(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|v\.gd|ow\.ly|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|tiny\.cc|t\.ly|rb\.gy|bit\.do|lnkd\.in|s\.id|short\.io|clck\.ru|tr\.ee)$/;

function isShortLink(href: string) {
    try {
        return KNOWN.test(new URL(href).hostname);
    } catch {
        return false;
    }
}

function ResultModal({ result, modalProps }: { result: ExpandResult; modalProps: RenderModalProps; }) {
    const final = result.chain[result.chain.length - 1];
    const warnings = final
        ? checkLink(final, "", { punycode: true, ipAddress: true, mismatchedText: false, lookalike: true, trustedDomains: [] })
        : [];

    return (
        <Modal {...modalProps} size="md" title="Where this link goes" subtitle={result.problem}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text-default, var(--text-normal))" }}>
                {result.chain.map((address, i) => (
                    <code key={i} style={{ wordBreak: "break-all" }}>
                        {i === result.chain.length - 1 ? "Ends at: " : `${i + 1}. `}
                        {address}
                    </code>
                ))}
                {warnings.length > 0 && (
                    <ul style={{ listStyle: "disc", paddingLeft: 18, color: "var(--status-danger, #da373c)" }}>
                        {warnings.map(w => <li key={w}>{w}</li>)}
                    </ul>
                )}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 0" }}>
                {final && (
                    <Button size="small" variant="secondary" onClick={() => copyToClipboard(final).then(() => showToast("Copied", Toasts.Type.SUCCESS))}>
                        Copy final address
                    </Button>
                )}
            </div>
        </Modal>
    );
}

async function expand(href: string) {
    try {
        const result = await Native.expandLink(href);
        openModal(props => <ResultModal result={result} modalProps={props} />);
    } catch (err) {
        logger.error("Failed to expand link", err);
        showToast("Could not check the link", Toasts.Type.FAILURE);
    }
}

const menuPatch: NavContextMenuPatchCallback = (children, props: { itemHref?: string; }) => {
    if (!props.itemHref || !isShortLink(props.itemHref)) return;
    children.push(<Menu.MenuItem id="bz-expand-link" label="Where does this link go?" action={() => expand(props.itemHref!)} />);
};

export default definePlugin({
    name: "ShortenerExpander",
    description: "Right-click a short link (bit.ly and similar) to see where it really leads before you open it. Only asks for the link's headers; no page is loaded.",
    tags: ["Privacy", "Chat"],
    searchTerms: ["bitly", "short link", "redirect", "unshorten", "expand"],

    contextMenus: {
        "message": menuPatch
    }
});
