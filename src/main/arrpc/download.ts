/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The Rich Presence helper (arRPC) is about 100 MB, so it is not inside the installer. It is downloaded from this
// version's GitHub release the first time it is wanted, and checked against the SHA256SUMS file of the same release.

import { createHash } from "crypto";
import { app, net } from "electron";
import { chmodSync, createWriteStream, mkdirSync, renameSync, rmSync } from "fs";
import { join } from "path";
import { REPO_SLUG } from "shared/repo";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";

import { DATA_DIR } from "../constants";
import { arrpcAssetName, findChecksum } from "./checksums";

const MAX_BYTES = 300 * 1024 * 1024;

export const BINARY_NAME = process.platform === "win32" ? "arrpc.exe" : "arrpc";
export const DOWNLOADED_DIR = join(DATA_DIR, "arrpc");
export const DOWNLOADED_PATH = join(DOWNLOADED_DIR, BINARY_NAME);

/**
 * Where the files are downloaded from. Only a development run (not an installed app) may change it, through
 * BAZINGA_ARRPC_BASE_URL, so the download can be tried without a release.
 */
function baseUrl() {
    const override = process.env.BAZINGA_ARRPC_BASE_URL;
    if (override && !app.isPackaged) return override.replace(/\/$/, "");
    return `https://github.com/${REPO_SLUG}/releases/download/v${app.getVersion()}`;
}

function checkedUrl(url: string) {
    const parsed = new URL(url);
    const local = !app.isPackaged && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))
        throw new Error("Downloads must use https");
    return parsed;
}

// Electron's own network stack is used instead of Node's fetch. It follows the system's proxy settings, and Node's
// fetch can crash the app when a server closes the connection while a big download is waiting to be written.
async function get(url: string) {
    // The time limit is for the server to start answering. A big file may then take as long as it needs.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
        const response = await net.fetch(checkedUrl(url).href, { redirect: "follow", signal: controller.signal });
        if (!response.ok)
            throw new Error(
                `The download failed (HTTP ${response.status}). This version of Bazinga may not be released yet, or there is no helper for ${process.platform} ${process.arch}.`
            );
        return response;
    } finally {
        clearTimeout(timer);
    }
}

/** Downloads the helper for this computer and puts it where Bazinga looks for it. Throws a readable error on failure. */
export async function downloadArRPC() {
    const name = arrpcAssetName(process.platform, process.arch);
    const base = baseUrl();

    const expected = findChecksum(await (await get(`${base}/SHA256SUMS.txt`)).text(), name);
    if (!expected) throw new Error(`The release has no checksum for ${name}, so it cannot be trusted`);

    const response = await get(`${base}/${name}`);
    if (!response.body) throw new Error("The download was empty");

    mkdirSync(DOWNLOADED_DIR, { recursive: true });
    const partial = `${DOWNLOADED_PATH}.part`;
    const hash = createHash("sha256");
    let size = 0;

    try {
        await pipeline(
            Readable.fromWeb(response.body as never),
            new Transform({
                transform(chunk: Buffer, _encoding, callback) {
                    size += chunk.length;
                    if (size > MAX_BYTES) return callback(new Error("The file is larger than expected"));
                    hash.update(chunk);
                    callback(null, chunk);
                }
            }),
            createWriteStream(partial)
        );

        if (hash.digest("hex") !== expected)
            throw new Error("The downloaded file does not match its checksum, so it was thrown away");

        chmodSync(partial, 0o755);
        renameSync(partial, DOWNLOADED_PATH);
    } catch (err) {
        rmSync(partial, { force: true });
        throw err;
    }
}
