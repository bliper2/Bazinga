/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import type { Message } from "@vencord/discord-types";
import { useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, fetchBlob } from "../_bazinga";

const logger = bazingaLogger("SvgPreview");

const MAX_BYTES = 1024 * 1024;
const isSvg = (name: string) => /\.svg$/i.test(name);

/**
 * Shows an SVG file as a picture. It is loaded as an image, and an image never runs scripts or loads other files,
 * so a hostile SVG cannot do anything beyond looking odd.
 */
function SvgImage({ url, name }: { url: string; name: string; }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | undefined;
        let cancelled = false;

        fetchBlob(url, MAX_BYTES)
            .then(blob => {
                // The server may send the file as plain text, so the type is set here.
                objectUrl = URL.createObjectURL(new Blob([blob], { type: "image/svg+xml" }));
                if (!cancelled) setSrc(objectUrl);
            })
            .catch(err => logger.warn(`Could not load ${name}`, err));

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url]);

    if (!src) return null;
    return (
        <img
            src={src}
            alt={name}
            title={name}
            style={{ maxWidth: 400, maxHeight: 300, marginTop: 4, borderRadius: 6, background: "#fff" }}
        />
    );
}

const Previews = ErrorBoundary.wrap(({ message }: { message: Message; }) => (
    <>
        {message.attachments.filter(a => isSvg(a.filename)).map(a => <SvgImage key={a.id} url={a.url} name={a.filename} />)}
    </>
), { noop: true });

export default definePlugin({
    name: "SvgPreview",
    description: "Shows SVG attachments as pictures in the chat, which Discord does not do. They are shown as plain images, so they cannot run anything.",
    tags: ["Media"],
    searchTerms: ["svg", "vector", "image", "preview"],

    renderMessageAccessory: props => {
        const message = props.message as Message;
        return message.attachments?.some(a => isSvg(a.filename)) ? <Previews message={message} /> : null;
    }
});
