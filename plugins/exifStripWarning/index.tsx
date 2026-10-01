/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import type { CloudUpload } from "@vencord/discord-types";

import { bazingaLogger, confirmDialog, definePlugin } from "../_bazinga";
import { hasGps, stripGps } from "./exif";

const logger = bazingaLogger("ExifStripWarning");

const MAX_SCAN_BYTES = 50 * 1024 * 1024;

const settings = definePluginSettings({
    alwaysStrip: {
        type: OptionType.BOOLEAN,
        description: "Remove location data automatically without asking",
        default: false
    }
});

async function readUpload(upload: CloudUpload) {
    const file = upload.item?.file;
    if (!(file instanceof File) || file.size > MAX_SCAN_BYTES || !/^image\/(jpeg|png)$/.test(file.type)) return null;
    return new Uint8Array(await file.arrayBuffer());
}

/** Swaps the file in an upload that has not started yet. Returns false when that is no longer possible. */
function replaceFile(upload: CloudUpload, bytes: Uint8Array) {
    if (upload.status && upload.status !== "NOT_STARTED") return false;
    const old = upload.item.file;
    upload.item.file = new File([bytes as BlobPart], old.name, { type: old.type, lastModified: old.lastModified });
    upload.preCompressionSize = bytes.length;
    upload.currentSize = bytes.length;
    return true;
}

export default definePlugin({
    name: "ExifStripWarning",
    description: "Warns before you upload a photo that contains your GPS location, and can remove the location without changing the image.",
    tags: ["Privacy", "Media"],
    searchTerms: ["exif", "gps", "location", "metadata", "photo"],
    enabledByDefault: true,
    settings,

    async onBeforeMessageSend(_channelId, _message, options) {
        const withGps: { upload: CloudUpload; bytes: Uint8Array; }[] = [];
        for (const upload of options.uploads ?? []) {
            try {
                const bytes = await readUpload(upload);
                if (bytes && hasGps(bytes)) withGps.push({ upload, bytes });
            } catch (err) {
                logger.error("Failed to read upload", err);
            }
        }
        if (!withGps.length) return;

        const names = withGps.map(w => w.upload.filename).join(", ");
        const choice = settings.store.alwaysStrip
            ? "confirm"
            : await confirmDialog({
                title: "Your photo contains its location",
                body: `${names} includes GPS coordinates that show where it was taken. Anyone who downloads it can see them.`,
                confirmText: "Remove location and send",
                secondaryText: "Send with location",
                cancelText: "Don't send"
            });

        if (choice === "cancel") return { cancel: true };
        if (choice === "secondary") return;

        const failed = withGps.filter(({ upload, bytes }) => !replaceFile(upload, stripGps(bytes)));
        if (!failed.length) return;

        // Discord had already started uploading these, so the original file would be sent.
        await confirmDialog({
            title: "Could not remove the location",
            body: `${failed.map(f => f.upload.filename).join(", ")} was already uploading. Remove it from the message and attach it again to try once more.`,
            confirmText: "OK",
            cancelText: "Close"
        });
        return { cancel: true };
    }
});
