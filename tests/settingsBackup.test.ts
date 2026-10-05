/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test } from "bun:test";

import { decryptBundle, encryptBundle, type SettingsBundle, validateBundle } from "../src/main/settingsBackup";

const bundle: SettingsBundle = {
    format: "bazinga-settings",
    version: 1,
    bazinga: { discordBranch: "ptb" },
    equicord: JSON.stringify({ plugins: { ScratchPad: { enabled: true } } }),
    quickCss: "body { color: red; }",
    themes: { "Orgeco-Gold.theme.css": "/* theme */" }
};

test("an encrypted backup opens with the right password only", () => {
    const file = encryptBundle(bundle, "correct horse");
    expect(JSON.stringify(file)).not.toContain("ScratchPad");

    expect(decryptBundle(file, "correct horse")).toEqual(bundle);
    expect(() => decryptBundle(file, "wrong")).toThrow();
});

test("a changed encrypted backup is refused", () => {
    const file = encryptBundle(bundle, "pw");
    const data = Buffer.from(file.data, "base64");
    data[0] ^= 1;
    expect(() => decryptBundle({ ...file, data: data.toString("base64") }, "pw")).toThrow();
});

test("validateBundle accepts a good file", () => {
    expect(validateBundle(bundle)).toBe(true);
});

test("validateBundle rejects unsafe or malformed files", () => {
    expect(validateBundle(null)).toBe(false);
    expect(validateBundle({ ...bundle, version: 2 })).toBe(false);
    expect(validateBundle({ ...bundle, equicord: "not json" })).toBe(false);
    expect(validateBundle({ ...bundle, themes: { "../evil.css": "x" } })).toBe(false);
    expect(validateBundle({ ...bundle, themes: { "a/b.css": "x" } })).toBe(false);
    expect(validateBundle({ ...bundle, themes: { "notcss.txt": "x" } })).toBe(false);
    expect(validateBundle({ ...bundle, themes: { "ok.css": 5 } })).toBe(false);
});
