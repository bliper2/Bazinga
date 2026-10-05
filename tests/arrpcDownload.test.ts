/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test } from "bun:test";

import { arrpcAssetName, findChecksum } from "../src/main/arrpc/checksums";

const hash = "a".repeat(64);
const other = "B".repeat(64);

test("a checksum is found by exact file name, in either sha256sum style", () => {
    const sums = `${hash}  arrpc-linux-x64\n${other} *arrpc-windows-x64.exe\r\nnot a checksum line\n`;
    expect(findChecksum(sums, "arrpc-linux-x64")).toBe(hash);
    expect(findChecksum(sums, "arrpc-windows-x64.exe")).toBe(other.toLowerCase());
    expect(findChecksum(sums, "arrpc-linux")).toBeNull();
    expect(findChecksum(sums, "../arrpc-linux-x64")).toBeNull();
    expect(findChecksum("", "arrpc-linux-x64")).toBeNull();
});

test("a short or non-hex checksum is not accepted", () => {
    expect(findChecksum("abc123  arrpc-linux-x64", "arrpc-linux-x64")).toBeNull();
    expect(findChecksum(`${"z".repeat(64)}  arrpc-linux-x64`, "arrpc-linux-x64")).toBeNull();
});

test("release file names match what the build produces", () => {
    expect(arrpcAssetName("win32", "x64")).toBe("arrpc-windows-x64.exe");
    expect(arrpcAssetName("win32", "arm64")).toBe("arrpc-windows-arm64.exe");
    expect(arrpcAssetName("darwin", "arm64")).toBe("arrpc-darwin-arm64");
    expect(arrpcAssetName("linux", "x64")).toBe("arrpc-linux-x64");
    // Anything that is not arm64 is treated as x64, like the build script does.
    expect(arrpcAssetName("linux", "ia32")).toBe("arrpc-linux-x64");
});
