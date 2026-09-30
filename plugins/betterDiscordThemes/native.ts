/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CspPolicies, ImageSrc } from "@main/csp";
import { THEMES_DIR } from "@main/utils/constants";
import { ensureSafePath } from "@main/utils/ensureSafePath";
import { IpcMainInvokeEvent } from "electron";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";

import type { StoreTheme } from "./types";

const STORE_URL = "https://api.betterdiscord.app/v3/store/themes";
const SOURCE_PREFIX = "https://raw.githubusercontent.com/";
const MAX_THEME_LENGTH = 5 * 1024 * 1024;
const THEME_FILE_NAME = /^[\w\-. ()[\]]+\.theme\.css$/;

// Store thumbnails are served from betterdiscord.app, which Discord's CSP blocks by default.
CspPolicies["betterdiscord.app"] = ImageSrc;

// The store API sends no CORS headers, so it is fetched here instead of in the renderer.
export async function getStoreThemes(_: IpcMainInvokeEvent): Promise<StoreTheme[]> {
    const res = await fetch(STORE_URL);
    if (!res.ok) throw new Error(`BetterDiscord store returned ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Unexpected BetterDiscord store response");

    return data
        .filter(t => t?.type === "theme" && typeof t.file_name === "string")
        .map(t => ({
            id: Number(t.id),
            name: String(t.name),
            fileName: String(t.file_name),
            description: String(t.description ?? ""),
            version: String(t.version ?? ""),
            author: String(t.author?.display_name ?? t.author?.github_name ?? "Unknown"),
            likes: Number(t.likes) || 0,
            downloads: Number(t.downloads) || 0,
            tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
            thumbnail: typeof t.thumbnail_url === "string" && t.thumbnail_url.startsWith("/")
                ? `https://betterdiscord.app${t.thumbnail_url}`
                : null,
            source: String(t.latest_source_url ?? ""),
            released: String(t.latest_release_date ?? "")
        }));
}

// The source URL comes from the renderer, so only allow the host the store uses.
async function fetchSource(url: string) {
    if (!url.startsWith(SOURCE_PREFIX)) throw new Error("Theme source is not hosted on raw.githubusercontent.com");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Theme download failed with status ${res.status}`);

    const css = await res.text();
    if (css.length > MAX_THEME_LENGTH) throw new Error("Theme file is too large");
    return css;
}

function themePath(fileName: string) {
    const path = THEME_FILE_NAME.test(fileName) ? ensureSafePath(THEMES_DIR, fileName) : null;
    if (!path) throw new Error(`Invalid theme file name: ${fileName}`);
    return path;
}

export function getThemeSource(_: IpcMainInvokeEvent, url: string) {
    return fetchSource(url);
}

export async function installTheme(_: IpcMainInvokeEvent, fileName: string, url: string) {
    const path = themePath(fileName);
    const css = await fetchSource(url);
    mkdirSync(THEMES_DIR, { recursive: true });
    writeFileSync(path, css);
}

export function uninstallTheme(_: IpcMainInvokeEvent, fileName: string) {
    const path = themePath(fileName);
    if (existsSync(path)) unlinkSync(path);
}
