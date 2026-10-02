/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Button } from "@components/Button";
import { copyToClipboard } from "@utils/clipboard";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { Menu, Modal, showToast, Toasts } from "@webpack/common";

import { bazingaLogger, definePlugin, loadFromCdn } from "../_bazinga";
import { checkLink } from "../linkGuard/analyze";

const logger = bazingaLogger("QRCodeReader");

const JSQR_URL = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
const JSQR_INTEGRITY = "sha384-hStSInNIZ8ljtOVrmrgf7zdHMapaLBWoSnPTtF0nzsybp4+LuhDz6sHuEVpWIX8o";
const MAX_SIDE = 1600;

async function decode(src: string): Promise<string | null> {
    await loadFromCdn(JSQR_URL, JSQR_INTEGRITY);

    const res = await fetch(src);
    if (!res.ok) throw new Error(`Could not download the image (HTTP ${res.status})`);
    const bitmap = await createImageBitmap(await res.blob());

    // Large photos are scaled down; QR codes stay readable and decoding stays fast.
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const pixels = ctx.getImageData(0, 0, width, height);
    const result = (window as any).jsQR(pixels.data, width, height, { inversionAttempts: "attemptBoth" });
    return result?.data ?? null;
}

const isWebLink = (text: string) => /^https?:\/\//i.test(text.trim());

function ResultModal({ text, modalProps }: { text: string; modalProps: RenderModalProps; }) {
    const link = isWebLink(text);
    const warnings = link
        ? checkLink(text.trim(), "", { punycode: true, ipAddress: true, mismatchedText: false, lookalike: true, trustedDomains: [] })
        : [];

    return (
        <Modal {...modalProps} size="md" title="QR code" subtitle={link ? "This QR code contains a link." : "This QR code contains text."}>
            {warnings.length > 0 && (
                <div style={{ marginBottom: 12, padding: "8px 12px", borderLeft: "4px solid var(--status-danger, #da373c)", borderRadius: 4, color: "var(--text-default, var(--text-normal))" }}>
                    <strong>Be careful with this link</strong>
                    <ul style={{ listStyle: "disc", paddingLeft: 18, margin: "4px 0 0" }}>
                        {warnings.map(w => <li key={w}>{w}</li>)}
                    </ul>
                </div>
            )}
            <code style={{ display: "block", wordBreak: "break-all", whiteSpace: "pre-wrap", marginBottom: 12 }}>{text}</code>
            <div style={{ display: "flex", gap: 8, paddingBottom: 12 }}>
                <Button size="small" variant="secondary" onClick={() => copyToClipboard(text).then(() => showToast("Copied", Toasts.Type.SUCCESS))}>
                    Copy
                </Button>
                {link && (
                    <Button size="small" variant={warnings.length ? "dangerPrimary" : "primary"} onClick={() => VencordNative.native.openExternal(text.trim())}>
                        {warnings.length ? "Open anyway" : "Open link"}
                    </Button>
                )}
            </div>
        </Modal>
    );
}

async function scan(src: string) {
    try {
        const text = await decode(src);
        if (!text) {
            showToast("No QR code found in this image", Toasts.Type.MESSAGE);
            return;
        }
        openModal(props => <ResultModal text={text} modalProps={props} />);
    } catch (err) {
        logger.error("Failed to scan image", err);
        showToast(`Could not scan the image: ${err instanceof Error ? err.message : String(err)}`, Toasts.Type.FAILURE);
    }
}

const item = (src: string) => <Menu.MenuItem id="bz-scan-qr" label="Scan QR code" action={() => scan(src)} />;

const messageMenuPatch: NavContextMenuPatchCallback = (children, props: { itemSrc?: string; itemHref?: string; }) => {
    const src = props.itemSrc ?? props.itemHref;
    if (src && /^https:\/\//.test(src)) children.push(item(src));
};

const imageMenuPatch: NavContextMenuPatchCallback = (children, props: { src?: string; }) => {
    if (props.src && /^https:\/\//.test(props.src)) children.push(item(props.src));
};

export default definePlugin({
    name: "QRCodeReader",
    description: "Right-click an image and choose Scan QR code to read it, with a warning if the link looks like a scam.",
    tags: ["Media", "Privacy"],
    searchTerms: ["qr", "qr code", "scan", "barcode", "scam"],

    contextMenus: {
        "message": messageMenuPatch,
        "image-context": imageMenuPatch
    }
});
