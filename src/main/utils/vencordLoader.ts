/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyFileSync, existsSync, statSync } from "original-fs";
import { join } from "path";
import { EQUICORD_ASAR_URL } from "shared/repo";

import { USER_AGENT } from "../constants";
import { State } from "../settings";
import { SEED_EQUICORD_ASAR, VENCORD_DIR } from "../vencordDir";
import { downloadFile, fetchie } from "./http";

const API_BASE = "https://api.github.com";

export interface ReleaseData {
    name: string;
    tag_name: string;
    html_url: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
    }>;
}

export async function githubGet(endpoint: string) {
    const opts: RequestInit = {
        headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": USER_AGENT
        }
    };

    if (process.env.GITHUB_TOKEN) (opts.headers! as any).Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    return fetchie(API_BASE + endpoint, opts, { retryOnNetworkError: true });
}

export async function downloadVencordAsar() {
    await downloadFile(EQUICORD_ASAR_URL, VENCORD_DIR, {}, { retryOnNetworkError: true });
}

export function isValidVencordInstall(dir: string) {
    return existsSync(join(dir, "equibop/main.js"));
}

// Install the Equicord build shipped with the app when it is new, for example after an app update.
// A build downloaded by Equicord's own updater is kept until the app ships a different one.
function installSeedIfChanged() {
    if (State.store.equicordDir || !existsSync(SEED_EQUICORD_ASAR)) return false;

    const { size, mtimeMs } = statSync(SEED_EQUICORD_ASAR);
    const seedId = `${size}-${Math.round(mtimeMs)}`;
    if (State.store.equicordSeed === seedId && existsSync(VENCORD_DIR)) return true;

    copyFileSync(SEED_EQUICORD_ASAR, VENCORD_DIR);
    State.store.equicordSeed = seedId;
    return true;
}

/** Replaces the Equicord in use with the build that came with the app, for example after a bad Equicord update. */
export function restoreBundledEquicord() {
    if (!existsSync(SEED_EQUICORD_ASAR)) throw new Error("This copy of Bazinga does not include a bundled Equicord.");

    copyFileSync(SEED_EQUICORD_ASAR, VENCORD_DIR);
    const { size, mtimeMs } = statSync(SEED_EQUICORD_ASAR);
    State.store.equicordSeed = `${size}-${Math.round(mtimeMs)}`;
}

export async function ensureVencordFiles() {
    if (installSeedIfChanged() || existsSync(VENCORD_DIR)) return;

    await downloadVencordAsar();
}
