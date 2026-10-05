/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Button } from "@components/Button";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { Menu, Modal, showToast, Toasts, useEffect, useRef, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, fetchBlob } from "../_bazinga";

const logger = bazingaLogger("GifFrameViewer");

const MAX_BYTES = 25 * 1024 * 1024;

// ImageDecoder is built into Chromium but is missing from some type definitions.
interface FrameDecoder {
    tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number; }; };
    decode(options: { frameIndex: number; }): Promise<{ image: VideoFrame; }>;
    close(): void;
}

function FrameModal({ src, modalProps }: { src: string; modalProps: RenderModalProps; }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const decoder = useRef<FrameDecoder | null>(null);
    const [count, setCount] = useState(0);
    const [frame, setFrame] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const Decoder = (window as unknown as { ImageDecoder?: new (init: object) => FrameDecoder; }).ImageDecoder;
            if (!Decoder) throw new Error("This version of Bazinga cannot read GIF frames");

            const blob = await fetchBlob(src, MAX_BYTES);
            const d = new Decoder({ data: await blob.arrayBuffer(), type: blob.type.startsWith("image/") ? blob.type : "image/gif" });
            await d.tracks.ready;
            if (cancelled) return d.close();
            decoder.current = d;
            setCount(d.tracks.selectedTrack?.frameCount ?? 1);
        })().catch(err => {
            logger.warn("Could not open the picture", err);
            if (!cancelled) setError(err instanceof Error ? err.message : "Could not open the picture");
        });

        return () => {
            cancelled = true;
            decoder.current?.close();
            decoder.current = null;
        };
    }, [src]);

    useEffect(() => {
        const d = decoder.current;
        const canvas = canvasRef.current;
        if (!d || !canvas || !count) return;

        let stale = false;
        d.decode({ frameIndex: frame })
            .then(({ image }) => {
                if (!stale) {
                    canvas.width = image.displayWidth;
                    canvas.height = image.displayHeight;
                    canvas.getContext("2d")!.drawImage(image, 0, 0);
                }
                image.close();
            })
            .catch(err => logger.warn("Could not read a frame", err));
        return () => { stale = true; };
    }, [frame, count]);

    const step = (by: number) => setFrame(f => (f + by + count) % count);
    const save = () =>
        canvasRef.current?.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = Object.assign(document.createElement("a"), { href: url, download: `frame-${frame + 1}.png` });
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }, "image/png");

    return (
        <Modal {...modalProps} size="lg" title="Frame by frame" subtitle={count ? `Frame ${frame + 1} of ${count}` : undefined}>
            {error ? <p style={{ color: "var(--text-muted)" }}>{error}</p> : (
                <>
                    <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 6, background: "var(--background-base-lowest, #111)" }} />
                    <input type="range" min={0} max={Math.max(0, count - 1)} value={frame} aria-label="Frame" style={{ width: "100%", margin: "12px 0 4px" }} onChange={e => setFrame(Number(e.currentTarget.value))} />
                    <div style={{ display: "flex", gap: 8, paddingBottom: 12 }}>
                        <Button size="small" variant="secondary" onClick={() => step(-1)}>Previous</Button>
                        <Button size="small" variant="secondary" onClick={() => step(1)}>Next</Button>
                        <Button size="small" onClick={save}>Save this frame</Button>
                    </div>
                </>
            )}
        </Modal>
    );
}

const item = (src: string) => (
    <Menu.MenuItem
        id="bz-gif-frames"
        label="View frame by frame"
        action={() => {
            if (!/^https:\/\//.test(src)) return showToast("This picture cannot be opened", Toasts.Type.FAILURE);
            openModal(props => <FrameModal src={src} modalProps={props} />);
        }}
    />
);

const messageMenuPatch: NavContextMenuPatchCallback = (children, props: { itemSrc?: string; itemHref?: string; }) => {
    const src = props.itemSrc ?? props.itemHref;
    if (src && /\.gif(\?|$)/i.test(src)) children.push(item(src));
};

const imageMenuPatch: NavContextMenuPatchCallback = (children, props: { src?: string; }) => {
    if (props.src && /\.gif(\?|$)/i.test(props.src)) children.push(item(props.src));
};

export default definePlugin({
    name: "GifFrameViewer",
    description: "Right-click a GIF to step through it one frame at a time and save any single frame as a picture.",
    tags: ["Media", "Fun"],
    searchTerms: ["gif", "frames", "animation", "step", "pause"],

    contextMenus: {
        "message": messageMenuPatch,
        "image-context": imageMenuPatch
    }
});
