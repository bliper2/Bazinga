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
import { Menu, Modal, showToast, Toasts, useEffect, useRef, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, fetchBlob } from "../_bazinga";
import { toHex } from "./hex";

const logger = bazingaLogger("ImageColorPicker");

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_SIDE = 640;

function PickerModal({ src, modalProps }: { src: string; modalProps: RenderModalProps; }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [color, setColor] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchBlob(src, MAX_BYTES)
            .then(createImageBitmap)
            .then(bitmap => {
                const canvas = canvasRef.current;
                if (cancelled || !canvas) return bitmap.close();
                const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
                canvas.width = Math.round(bitmap.width * scale);
                canvas.height = Math.round(bitmap.height * scale);
                canvas.getContext("2d", { willReadFrequently: true })!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                bitmap.close();
            })
            .catch(err => {
                logger.warn("Could not load the image", err);
                if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the image");
            });
        return () => { cancelled = true; };
    }, [src]);

    const sample = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
        const [r, g, b] = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(x, y, 1, 1).data;
        setColor(toHex(r, g, b));
    };

    return (
        <Modal {...modalProps} size="lg" title="Pick a color" subtitle="Click anywhere on the picture.">
            {error ? <p style={{ color: "var(--text-muted)" }}>{error}</p> : (
                <canvas ref={canvasRef} onClick={sample} style={{ maxWidth: "100%", cursor: "crosshair", borderRadius: 6 }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", color: "var(--text-default, var(--text-normal))" }}>
                <span style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid var(--border-subtle)", background: color ?? "transparent" }} />
                <code>{color ?? "No color picked yet"}</code>
                {color && (
                    <Button size="small" onClick={() => copyToClipboard(color).then(() => showToast(`Copied ${color}`, Toasts.Type.SUCCESS))}>
                        Copy
                    </Button>
                )}
            </div>
        </Modal>
    );
}

const item = (src: string) => (
    <Menu.MenuItem id="bz-pick-color" label="Pick a color" action={() => openModal(props => <PickerModal src={src} modalProps={props} />)} />
);

const messageMenuPatch: NavContextMenuPatchCallback = (children, props: { itemSrc?: string; itemHref?: string; }) => {
    const src = props.itemSrc ?? props.itemHref;
    if (src && /^https:\/\//.test(src)) children.push(item(src));
};

const imageMenuPatch: NavContextMenuPatchCallback = (children, props: { src?: string; }) => {
    if (props.src && /^https:\/\//.test(props.src)) children.push(item(props.src));
};

export default definePlugin({
    name: "ImageColorPicker",
    description: "Right-click a picture and choose Pick a color to read the exact color of any spot and copy its code.",
    tags: ["Media", "Utility"],
    searchTerms: ["color", "eyedropper", "hex", "pick", "palette"],

    contextMenus: {
        "message": messageMenuPatch,
        "image-context": imageMenuPatch
    }
});
