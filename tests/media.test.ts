/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test } from "bun:test";

import { collectMedia } from "../plugins/channelGallery/media";
import { colorMatrix, MODES, type Mode, svgMatrixValues } from "../plugins/colorBlindModes/matrix";
import { describeMessage } from "../plugins/liveRegionMessages/describe";
import { toHex } from "../plugins/imageColorPicker/hex";
import { applyDesired, DEFAULT_CONFIG, desiredTheme, isNight, managedThemes } from "../plugins/themeScheduler/schedule";
import { deriveAccent, isDark, isHex, shade, slugify, themeFileName } from "../plugins/themeStudio/studio";
import { needsShrink, nextScale } from "../plugins/uploadShrink/shrink";
import { PALETTE_FIELDS, renderTheme, type Palette } from "../src/shared/themeTemplate";

const palette: Palette = {
    bg0: "#000000", bg1: "#111111", bg2: "#222222", bg3: "#333333", hover: "#444444", text: "#eeeeee", muted: "#999999",
    strong: "#ffffff", accent: "#ff0000", accentHover: "#ff5555", onAccent: "#ffffff", link: "#ff8888", border: "#555555",
    mention: "rgb(255 0 0 / 14%)"
};
const meta = { name: "Test", author: "tester", description: "A test theme.", version: "1.0.0" };

test("the theme template writes every color and the theme header", () => {
    const css = renderTheme(meta, palette);
    expect(css).toContain("@name Test");
    expect(css).toContain("@author tester");
    expect(css).toContain("--bz-accent: #ff0000;");
    expect(css).toContain("--background-base-lowest: #000000;");
    expect(css).toContain("--brand-500: var(--bz-accent);");
    expect(PALETTE_FIELDS.map(f => f.key).sort()).toEqual(Object.keys(palette).sort());
});

test("the theme template refuses colors that are not colors and cleans header text", () => {
    expect(() => renderTheme(meta, { ...palette, accent: "red; } body { display: none" })).toThrow();
    expect(() => renderTheme(meta, { ...palette, text: "url(https://evil.example)" })).toThrow();
    expect(() => renderTheme(meta, { ...palette, bg0: "#12345g" })).toThrow();
    expect(() => renderTheme(meta, { ...palette, mention: "hsl(120 50% 50% / 20%)" })).not.toThrow();

    const css = renderTheme({ ...meta, name: "Bad */ body{display:none} name\nnext" }, palette);
    expect(css.split("*/")[0]).toContain("@name Bad body{display:none} name next");
    // The first comment end is the real one, so the whole header, including the source line, is inside the comment.
    expect(css.split("*/")[0]).toContain("@source");
});

test("Theme Studio works out the accent colors and file names", () => {
    expect(isHex("#a1B2c3")).toBe(true);
    expect(isHex("#fff")).toBe(false);
    expect(shade("#000000", 0.5)).toBe("#808080");
    expect(shade("#ffffff", -0.5)).toBe("#808080");
    expect(isDark("#101010")).toBe(true);
    expect(isDark("#f0f0f0")).toBe(false);
    expect(deriveAccent("#ff0000").mention).toBe("#ff000024");
    expect(deriveAccent("#101010").accentHover).not.toBe("#101010");
    expect(slugify("Café Noir! v2")).toBe("Cafe-Noir-v2");
    expect(themeFileName("../../evil")).toBe("Studio-evil.theme.css");
    expect(themeFileName("")).toBe("Studio-My-theme.theme.css");
});

test("ThemeScheduler picks a theme by time, system setting or server", () => {
    const config = { ...DEFAULT_CONFIG, mode: "time" as const, dayTheme: "day.css", nightTheme: "night.css" };
    const at = (hour: number) => new Date(2026, 0, 1, hour, 0);

    expect(isNight(at(12), "07:00", "19:00")).toBe(false);
    expect(isNight(at(22), "07:00", "19:00")).toBe(true);
    expect(isNight(at(3), "07:00", "19:00")).toBe(true);
    expect(isNight(at(23), "06:00", "20:00")).toBe(true);
    expect(isNight(at(12), "06:00", "20:00")).toBe(false);
    // A "day" that starts after the night starts (day 20:00, night 06:00) means the night is the daytime hours.
    expect(isNight(at(12), "20:00", "06:00")).toBe(true);
    expect(isNight(at(12), "07:00", "07:00")).toBe(false);

    expect(desiredTheme(config, { now: at(12), systemDark: true, guildId: null })).toBe("day.css");
    expect(desiredTheme(config, { now: at(22), systemDark: false, guildId: null })).toBe("night.css");
    expect(desiredTheme({ ...config, mode: "system" }, { now: at(12), systemDark: true, guildId: null })).toBe("night.css");
    expect(desiredTheme({ ...config, mode: "off" }, { now: at(12), systemDark: true, guildId: null })).toBeNull();

    const withGuild = { ...config, guildThemes: { "5": "server.css" } };
    expect(desiredTheme(withGuild, { now: at(12), systemDark: false, guildId: "5" })).toBe("server.css");
    expect(desiredTheme(withGuild, { now: at(12), systemDark: false, guildId: "6" })).toBe("day.css");
});

test("ThemeScheduler only changes the themes it manages", () => {
    const config = { ...DEFAULT_CONFIG, dayTheme: "a.css", nightTheme: "b.css", guildThemes: { "1": "c.css", "2": "a.css" } };
    expect(managedThemes(config)).toEqual(["a.css", "b.css", "c.css"]);
    expect(applyDesired(["mine.css", "a.css"], ["a.css", "b.css"], "b.css")).toEqual(["mine.css", "b.css"]);
    expect(applyDesired(["mine.css", "a.css"], ["a.css", "b.css"], null)).toEqual(["mine.css"]);
    expect(applyDesired(["mine.css"], [], null)).toEqual(["mine.css"]);
});

test("UploadShrink targets smaller sizes and only shrinks pictures over the limit", () => {
    const limit = 10 * 1024 * 1024;
    expect(needsShrink({ type: "image/png", size: limit + 1 }, limit)).toBe(true);
    expect(needsShrink({ type: "image/png", size: limit }, limit)).toBe(false);
    expect(needsShrink({ type: "image/gif", size: limit * 2 }, limit)).toBe(false);
    expect(needsShrink({ type: "video/mp4", size: limit * 2 }, limit)).toBe(false);

    const scale = nextScale(limit * 4, limit, 1);
    expect(scale).toBeGreaterThan(0.3);
    expect(scale).toBeLessThan(0.5);
    // Even when almost at the limit, each step makes the picture smaller, so repeating always ends.
    expect(nextScale(limit * 1.001, limit, 1)).toBeLessThanOrEqual(0.95);
});

test("ChannelGallery lists pictures and videos once, newest first", () => {
    const items = collectMedia([
        { id: "1", attachments: [{ url: "https://x/a.png", filename: "a.png", content_type: "image/png" }] },
        { id: "2", attachments: [{ url: "https://x/v.mp4", filename: "v.mp4" }, { url: "https://x/doc.pdf", filename: "doc.pdf" }] },
        { id: "3", embeds: [{ type: "image", thumbnail: { url: "https://x/t.png" } }, { type: "link", thumbnail: { url: "https://x/skip.png" } }] },
        { id: "4", attachments: [{ url: "https://x/a.png", filename: "a.png" }] }
    ]);
    expect(items.map(i => [i.messageId, i.kind, i.url])).toEqual([
        ["4", "image", "https://x/a.png"],
        ["3", "image", "https://x/t.png"],
        ["2", "video", "https://x/v.mp4"]
    ]);
});

test("color blind matrices keep white, leave colors alone when off and avoid NaN", () => {
    expect(colorMatrix("none")).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    expect(svgMatrixValues("none")).toBe("1.00000 0.00000 0.00000 0 0  0.00000 1.00000 0.00000 0 0  0.00000 0.00000 1.00000 0 0  0 0 0 1 0");

    for (const mode of Object.keys(MODES) as Mode[]) {
        const rows = colorMatrix(mode);
        expect(rows).toHaveLength(3);
        for (const row of rows) {
            expect(row).toHaveLength(3);
            for (const value of row) expect(Number.isFinite(value)).toBe(true);
        }
        // White stays near white in every mode, so the page does not turn dim.
        if (mode.startsWith("simulate-")) {
            for (const row of rows) expect(row[0] + row[1] + row[2]).toBeCloseTo(1, 1);
        }
    }
    // Help modes move the error to colors that can be seen: the matrix is not the identity.
    expect(colorMatrix("help-deuteranopia")).not.toEqual(colorMatrix("none"));
});

test("screen reader text turns markup into words", () => {
    expect(describeMessage({ content: "hi <@123> see <:pog:5> https://example.com **now**", author: { username: "ann", globalName: "Ann" } }, 300)).toBe(
        "Ann: hi a mention see pog emoji a link now"
    );
    expect(describeMessage({ content: "", author: { username: "bob" }, attachments: [{ filename: "cat.png" }] }, 300)).toBe("bob: attachment cat.png");
    expect(describeMessage({ content: "", author: { username: "bob" } }, 300)).toBe("");
    expect(describeMessage({ content: "x".repeat(50), author: { username: "bob" } }, 10)).toBe(`bob: ${"x".repeat(10)}…`);
});

test("hex colors are padded and kept in range", () => {
    expect(toHex(255, 0, 128)).toBe("#ff0080");
    expect(toHex(0, 0, 0)).toBe("#000000");
    expect(toHex(300, -5, 15.6)).toBe("#ff0010");
});
