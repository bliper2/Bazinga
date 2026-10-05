/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Finds the SHA-256 of a file in the text of a SHA256SUMS file, where each line is `<64 hex characters>  <name>`
 * (a `*` in front of the name marks binary mode and is ignored). Returns null when the file is not listed.
 */
export function findChecksum(sums: string, fileName: string) {
    for (const line of sums.split(/\r?\n/)) {
        const match = /^([0-9a-f]{64})\s+\*?(.+?)\s*$/i.exec(line);
        if (match && match[2] === fileName) return match[1].toLowerCase();
    }
    return null;
}

/** The release file name of the Rich Presence helper for a platform and CPU, as built by scripts/build/compileArrpc.mts. */
export function arrpcAssetName(platform: string, arch: string) {
    const system = platform === "win32" ? "windows" : platform;
    return `arrpc-${system}-${arch === "arm64" ? "arm64" : "x64"}${platform === "win32" ? ".exe" : ""}`;
}
