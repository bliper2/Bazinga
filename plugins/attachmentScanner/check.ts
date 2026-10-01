/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** File types that run code when opened, on Windows, macOS or Android. */
const EXECUTABLE = new Set([
    "exe", "scr", "com", "pif", "bat", "cmd", "msi", "msix", "msp", "appx", "appxbundle", "ps1", "psm1",
    "vbs", "vbe", "jse", "wsf", "wsh", "hta", "lnk", "url", "cpl", "reg", "dll", "sys", "jar", "gadget",
    "application", "iso", "img", "vhd", "vhdx", "apk", "xapk", "dmg", "pkg", "app", "command", "scpt", "chm",
    "xll", "docm", "xlsm", "pptm"
]);

const ARCHIVE = new Set(["zip", "rar", "7z", "tar", "gz", "cab", "ace", "arj"]);

/** Extensions people expect to be harmless, used for the double-extension check. */
const HARMLESS_LOOKING = new Set(["pdf", "jpg", "jpeg", "png", "gif", "txt", "doc", "docx", "mp3", "mp4", "mov", "webp"]);

const BIDI_CONTROL = /[‪-‮⁦-⁩‎‏]/;

/** Returns human-readable reasons why a file name looks dangerous. */
export function checkFileName(fileName: string, includeArchives: boolean): string[] {
    const reasons: string[] = [];
    const parts = fileName.toLowerCase().split(".");
    const ext = parts.length > 1 ? parts[parts.length - 1] : "";
    const previous = parts.length > 2 ? parts[parts.length - 2].trim() : "";

    if (BIDI_CONTROL.test(fileName)) {
        reasons.push("The name contains hidden text-direction characters that disguise its real extension.");
    }
    if (EXECUTABLE.has(ext)) {
        reasons.push(`.${ext} files can run programs or macros on your computer.`);
        if (HARMLESS_LOOKING.has(previous)) reasons.push(`It pretends to be a .${previous} file.`);
    } else if (includeArchives && ARCHIVE.has(ext)) {
        reasons.push(`.${ext} archives can hide programs inside.`);
    }
    if (/\s{5,}\./.test(fileName)) {
        reasons.push("Long runs of spaces in the name can push the real extension out of view.");
    }
    return reasons;
}
