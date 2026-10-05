/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Tests for the plugin logic that does not need Discord: each plugin keeps it in a separate file for this reason.

import { expect, test } from "bun:test";

import { checkFileName } from "../plugins/attachmentScanner/check";
import { buildMatcher } from "../plugins/censor/matcher";
import { parseCsv } from "../plugins/csvTablePreview/csv";
import { hasGps, stripGps } from "../plugins/exifStripWarning/exif";
import { checkLink } from "../plugins/linkGuard/analyze";
import { extractMath } from "../plugins/mathRender/extract";
import { looksLike } from "../plugins/impersonationAlert/compare";
import { findSecrets, isSensitiveFileName } from "../plugins/secretLeakGuard/patterns";
import { tameCombiningMarks } from "../plugins/zalgoFilter/tame";

const linkOptions = { punycode: true, ipAddress: true, mismatchedText: true, lookalike: true, trustedDomains: [] as string[] };

test("LinkGuard allows normal links", () => {
    for (const [href, text] of [
        ["https://discord.com/channels/1", "x"],
        ["https://github.com/bliper2/Bazinga", "github.com/bliper2/Bazinga"],
        ["https://www.youtube.com/watch?v=1", "https://www.youtube.com/watch?v=1"],
        ["https://store.steampowered.com/app/1", "Steam"],
        ["https://en.wikipedia.org/wiki/X", "wiki"]
    ]) {
        expect(checkLink(href, text, linkOptions)).toEqual([]);
    }
});

test("LinkGuard flags lookalike, punycode, IP and mismatched links", () => {
    for (const [href, text] of [
        ["https://discord-nitro-gift.com/claim", "free nitro"],
        ["https://dlscord.gift/abc", "x"],
        ["https://dicsord.com/abc", "x"],
        ["https://steamcommunlty.com/tradeoffer", "x"],
        ["https://xn--dscord-pvf.com/", "x"],
        ["http://192.168.0.1/login", "x"],
        ["https://evil.example/", "discord.com/nitro"]
    ]) {
        expect(checkLink(href, text, linkOptions).length).toBeGreaterThan(0);
    }
});

test("SecretLeakGuard finds secrets and ignores ordinary numbers", () => {
    const options = { cards: true, passwords: true };
    expect(findSecrets("key AKIAABCDEFGHIJKLMNOP here", options)).toContain("an AWS access key");
    expect(findSecrets(`ghp_${"a".repeat(36)}`, options)).toContain("a GitHub token");
    expect(findSecrets("-----BEGIN RSA PRIVATE KEY-----", options)).toContain("a private key");
    expect(findSecrets("password: hunter22", options)).toContain("a password");
    expect(findSecrets("card 4111 1111 1111 1111", options)).toContain("a payment card number");

    expect(findSecrets("hello, see <@123456789012345678> at 1234567890123456789", options)).toEqual([]);
    expect(findSecrets("my password is safe lol", options)).toEqual([]);
    expect(findSecrets("order 1234 5678 9012 3456", options)).toEqual([]);
});

test("AttachmentScanner flags risky file names", () => {
    expect(checkFileName("setup.exe", false)).toHaveLength(1);
    expect(checkFileName("invoice.pdf.exe", false)).toHaveLength(2);
    expect(checkFileName("photo‮gpj.exe", false).length).toBeGreaterThan(0);
    expect(checkFileName("cat.png", false)).toEqual([]);
    expect(checkFileName("stuff.zip", false)).toEqual([]);
    expect(checkFileName("stuff.zip", true)).toHaveLength(1);
});

function jpegWithGps() {
    const tiff = new Uint8Array(68);
    const view = new DataView(tiff.buffer);
    tiff.set([0x49, 0x49, 0x2a, 0x00]);
    view.setUint32(4, 8, true);
    // IFD0 with one entry: the GPS pointer.
    view.setUint16(8, 1, true);
    view.setUint16(10, 0x8825, true);
    view.setUint16(12, 4, true);
    view.setUint32(14, 1, true);
    view.setUint32(18, 26, true);
    // GPS IFD with one entry whose value is stored outside the entry.
    view.setUint16(26, 1, true);
    view.setUint16(28, 2, true);
    view.setUint16(30, 5, true);
    view.setUint32(32, 3, true);
    view.setUint32(36, 44, true);
    tiff.fill(0x7f, 44, 68);

    const app1 = [...new TextEncoder().encode("Exif\0\0"), ...tiff];
    const length = app1.length + 2;
    return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...app1, 0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);
}

test("ExifStripWarning detects and removes GPS data without touching the input", () => {
    const jpeg = jpegWithGps();
    expect(hasGps(jpeg)).toBe(true);

    const stripped = stripGps(jpeg);
    expect(hasGps(stripped)).toBe(false);
    expect(stripped.length).toBe(jpeg.length);
    expect([...stripped.subarray(12 + 44, 12 + 68)].every(byte => byte === 0)).toBe(true);

    expect(hasGps(jpeg)).toBe(true);
    expect(hasGps(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe(false);
});

test("MathRender finds display math and skips prices and code", () => {
    expect(extractMath("see $$x^2$$ ok", false)).toEqual([{ tex: "x^2", display: true }]);
    expect(extractMath("```$$no$$``` and `$$no$$`", false)).toEqual([]);
    expect(extractMath("costs $5 and $10", true)).toEqual([]);
    expect(extractMath("inline $a+b$ here", true)).toEqual([{ tex: "a+b", display: false }]);
    expect(extractMath("inline $a+b$ here", false)).toEqual([]);
});

test("Censor matches whole words, phrases and non-Latin text", () => {
    const mask = (re: RegExp, text: string) => text.replace(re, match => "•".repeat(match.length));

    expect(buildMatcher(" , ", true)).toBeNull();
    const words = buildMatcher("ass, bad word, c++", true)!;
    expect(mask(words, "class is BAD WORD, ass!")).toBe("class is ••••••••, •••!");
    expect(mask(words, "I like c++ a lot")).toBe("I like ••• a lot");
    expect(mask(buildMatcher("ass", false)!, "class")).toBe("cl•••");
    expect(mask(buildMatcher("кот", true)!, "кот котик")).toBe("••• котик");
});

test("CsvTablePreview parses quotes, delimiters and row limits", () => {
    expect(parseCsv('a,b\n1,"x, y"\n2,"say ""hi"""\n', 10)).toEqual([["a", "b"], ["1", "x, y"], ["2", 'say "hi"']]);
    expect(parseCsv("a;b\r\n1;2", 10)).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a\tb\n1\t2\n3\t4", 2)).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a,b\n\n1,2\n", 10)).toEqual([["a", "b"], ["1", "2"]]);
});

test("LinkGuard flags gift-scam wording on unofficial domains only", () => {
    expect(checkLink("https://free-nitro-claim.xyz/", "x", linkOptions).length).toBeGreaterThan(0);
    expect(checkLink("https://robux-generator.net/", "x", linkOptions).length).toBeGreaterThan(0);
    expect(checkLink("https://discord.com/nitro", "x", linkOptions)).toEqual([]);
    expect(checkLink("https://example.com/giftshop", "x", linkOptions)).toEqual([]);
});

test("SecretLeakGuard flags files that usually hold secrets", () => {
    for (const name of [".env", ".env.local", "id_rsa", "server.pem", "my.key", "wallet.dat", "credentials.json", "backup.kdbx"]) {
        expect(isSensitiveFileName(name)).toBe(true);
    }
    for (const name of ["photo.png", "environment.txt", "keynote.pptx", "monkey.png"]) {
        expect(isSensitiveFileName(name)).toBe(false);
    }
});

test("ZalgoFilter keeps normal accents and trims stacked ones", () => {
    expect(tameCombiningMarks("café résumé", 2)).toBe("café résumé");
    const glitchy = "h̀́̂̃̄̅i";
    expect(tameCombiningMarks(glitchy, 2)).toBe("h̀́i");
    expect(tameCombiningMarks(glitchy, 0)).toBe("hi");
});

test("ImpersonationAlert flags near-identical names only", () => {
    expect(looksLike("Alexander", "Alexandr")).toBe(true);
    expect(looksLike("Alexander", "A1exander")).toBe(true);
    expect(looksLike("Alexander", "alexander")).toBe(false);
    expect(looksLike("Alexander", "Benjamin")).toBe(false);
    expect(looksLike("Bob", "Rob")).toBe(false);
});
