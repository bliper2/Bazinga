/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test } from "bun:test";

import { archPkgbuild, homebrewCask, parseChecksums, scoopManifest, wingetManifests } from "../scripts/packaging/manifests";

const files = [
    "Bazinga-1.2.3-win.zip",
    "Bazinga-1.2.3-arm64-win.zip",
    "Bazinga-1.2.3-universal.dmg",
    "bazinga-1.2.3.tar.gz",
    "bazinga-1.2.3-arm64.tar.gz",
    "Bazinga-Setup-1.2.3-x64.exe",
    "Bazinga-Setup-1.2.3-arm64.exe"
];
const sums = Object.fromEntries(files.map((file, i) => [file, String(i).repeat(64)]));

test("a SHA256SUMS file is read into a map", () => {
    expect(parseChecksums(`${"a".repeat(64)}  one.zip\n${"B".repeat(64)} *two.dmg\nbad line\n`)).toEqual({
        "one.zip": "a".repeat(64),
        "two.dmg": "b".repeat(64)
    });
});

test("the Scoop manifest points at the release files with their hashes", () => {
    const manifest = JSON.parse(scoopManifest("1.2.3", sums));
    expect(manifest.version).toBe("1.2.3");
    expect(manifest.architecture["64bit"].url).toBe("https://github.com/bliper2/Bazinga/releases/download/v1.2.3/Bazinga-1.2.3-win.zip");
    expect(manifest.architecture["64bit"].hash).toBe("0".repeat(64));
    expect(manifest.architecture.arm64.hash).toBe("1".repeat(64));
});

test("the Homebrew, Arch and winget files carry the right hashes", () => {
    expect(homebrewCask("1.2.3", sums)).toContain(`sha256 "${"2".repeat(64)}"`);
    expect(archPkgbuild("1.2.3", sums)).toContain(`sha256sums_x86_64=('${"3".repeat(64)}')`);
    expect(archPkgbuild("1.2.3", sums)).toContain(`sha256sums_aarch64=('${"4".repeat(64)}')`);

    const winget = wingetManifests("1.2.3", sums, "2026-10-05");
    expect(Object.keys(winget)).toEqual(["bliper2.Bazinga.yaml", "bliper2.Bazinga.installer.yaml", "bliper2.Bazinga.locale.en-US.yaml"]);
    expect(winget["bliper2.Bazinga.installer.yaml"]).toContain(`InstallerSha256: ${"5".repeat(64)}`);
    expect(winget["bliper2.Bazinga.installer.yaml"]).toContain("Bazinga-Setup-1.2.3-arm64.exe");
});

test("a missing file in the checksums is an error, not an empty hash", () => {
    expect(() => scoopManifest("1.2.3", {})).toThrow("no entry for Bazinga-1.2.3-win.zip");
    expect(() => homebrewCask("9.9.9", sums)).toThrow();
});
