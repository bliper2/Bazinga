/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import type { CloudUpload } from "@vencord/discord-types";
import { showToast, Toasts } from "@webpack/common";

import { bazingaLogger, confirmDialog, definePlugin } from "../_bazinga";
import { MIN_SIDE, needsShrink, nextScale } from "./shrink";

const logger = bazingaLogger("UploadShrink");

const MB = 1024 * 1024;
const MAX_ATTEMPTS = 8;

const settings = definePluginSettings({
    limitMB: {
        type: OptionType.NUMBER,
        description: "Size limit for your uploads in MB. Discord's limit for free accounts is 10 MB; set the limit your account really has",
        default: 10,
        isValid: (value: number) => (value >= 1 && value <= 500) || "Use a number from 1 to 500"
    },
    alwaysShrink: {
        type: OptionType.BOOLEAN,
        description: "Shrink pictures that are too big without asking",
        default: false
    }
});

/** Draws the picture smaller, and for JPEG and WebP also lowers the quality, until it fits. Returns null if it cannot. */
async function shrink(file: File, limitBytes: number): Promise<File | null> {
    const bitmap = await createImageBitmap(file);
    try {
        const lossy = file.type !== "image/png";
        let scale = 1;
        let quality = 0.9;
        let { size } = file;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            if (attempt > 0 || !lossy) scale = nextScale(size, limitBytes, scale);
            const width = Math.round(bitmap.width * scale);
            const height = Math.round(bitmap.height * scale);
            if (Math.min(width, height) < MIN_SIDE) return null;

            const canvas = new OffscreenCanvas(width, height);
            canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
            const blob = await canvas.convertToBlob({ type: file.type, quality: lossy ? quality : undefined });

            if (blob.size <= limitBytes) return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
            size = blob.size;
            quality = Math.max(0.5, quality - 0.1);
        }
        return null;
    } finally {
        bitmap.close();
    }
}

/** Swaps the file in an upload that has not started yet. Returns false when that is no longer possible. */
function replaceFile(upload: CloudUpload, file: File) {
    if (upload.status && upload.status !== "NOT_STARTED") return false;
    upload.item.file = file;
    upload.preCompressionSize = file.size;
    upload.currentSize = file.size;
    return true;
}

export default definePlugin({
    name: "UploadShrink",
    description: "When a picture is over your upload limit, offers to make it smaller so it can be sent. It stays within the limit; it never goes around it.",
    tags: ["Media", "Utility"],
    searchTerms: ["compress", "resize", "too large", "upload", "image size", "shrink"],
    settings,

    async onBeforeMessageSend(_channelId, _message, options) {
        const limit = settings.store.limitMB * MB;
        const big = (options.uploads ?? []).filter(u => u.item?.file instanceof File && needsShrink(u.item.file, limit));
        if (!big.length) return;

        const names = big.map(u => u.filename).join(", ");
        const choice = settings.store.alwaysShrink
            ? "confirm"
            : await confirmDialog({
                title: "This picture is too big to send",
                body: `${names} is over ${settings.store.limitMB} MB. Shrink it to fit? The picture will look the same, only smaller.`,
                confirmText: "Shrink and send",
                secondaryText: "Send as it is",
                cancelText: "Don't send"
            });
        if (choice === "cancel") return { cancel: true };
        if (choice === "secondary") return;

        const failed: string[] = [];
        for (const upload of big) {
            try {
                const smaller = await shrink(upload.item.file, limit);
                if (!smaller || !replaceFile(upload, smaller)) failed.push(upload.filename);
            } catch (err) {
                logger.error("Failed to shrink", err);
                failed.push(upload.filename);
            }
        }

        if (!failed.length) return;
        showToast(`Could not shrink ${failed.join(", ")}`, Toasts.Type.FAILURE);
        return { cancel: true };
    }
});
