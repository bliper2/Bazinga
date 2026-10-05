/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test } from "bun:test";

import { computeStats } from "../plugins/channelStats/stats";
import { addToCounts, findEmoji, topEmoji } from "../plugins/emojiUsageStats/count";
import { buildReadabilityCss } from "../plugins/readability/css";
import { runRegexHere } from "../plugins/regexTester/test";
import { detectScript } from "../plugins/scriptBadge/detect";

test("ScriptBadge names the main writing system and ignores short or mixed text", () => {
    expect(detectScript("Привет, как у вас дела сегодня?")).toBe("Cyrillic");
    expect(detectScript("今日は天気がとても良いですね")).toBe("Japanese kana");
    expect(detectScript("안녕하세요 오늘 날씨가 좋네요")).toBe("Korean");
    expect(detectScript("Hello there, how is everyone today?")).toBe("Latin");
    expect(detectScript("ok")).toBeNull();
    expect(detectScript("https://example.com/ссылка/длинная/очень <@123456789>")).toBeNull();
    expect(detectScript("Hello мир привет world")).toBeNull();
});

test("ChannelStats counts posters, hours and attachments", () => {
    const at = (hour: number) => new Date(2026, 0, 1, hour, 30).getTime();
    const stats = computeStats([
        { authorId: "1", authorName: "Ann", time: at(9), length: 10, attachments: 0 },
        { authorId: "1", authorName: "Ann", time: at(9), length: 30, attachments: 2 },
        { authorId: "2", authorName: "Bob", time: at(14), length: 20, attachments: 0 }
    ]);

    expect(stats.total).toBe(3);
    expect(stats.topPosters.map(p => [p.name, p.count])).toEqual([["Ann", 2], ["Bob", 1]]);
    expect(stats.byHour[9]).toBe(2);
    expect(stats.byHour[14]).toBe(1);
    expect(stats.attachments).toBe(2);
    expect(stats.averageLength).toBe(20);
    expect(stats.firstTime).toBe(at(9));
    expect(stats.lastTime).toBe(at(14));
    expect(computeStats([])).toMatchObject({ total: 0, firstTime: 0, averageLength: 0 });
});

test("EmojiUsageStats finds custom and Unicode emoji but not those in code", () => {
    expect(findEmoji("hi <:pog:123456> and <a:wave:99> 😀 👍🏽")).toEqual([":pog:", ":wave:", "😀", "👍🏽"]);
    expect(findEmoji("`😀` and ```\n😀\n```")).toEqual([]);

    const counts = addToCounts(addToCounts({}, "😀 😀 <:a1:1>"), "😀");
    expect(counts).toEqual({ "😀": 3, ":a1:": 1 });
    expect(topEmoji(counts, 1)).toEqual([["😀", 3]]);
    const unchanged = {};
    expect(addToCounts(unchanged, "no emoji here")).toBe(unchanged);
});

test("Readability builds safe CSS", () => {
    const css = buildReadabilityCss({ family: "Lexend", fontScale: 125, lineHeight: 1.6, letterSpacing: 0.05, maxWidth: 600 });
    expect(css).toContain("line-height: 1.6 !important");
    expect(css).toContain("font-size: 125% !important");
    expect(css).toContain("letter-spacing: 0.05em !important");
    expect(css).toContain("max-width: 600px");
    expect(css).toContain('font-family: "Lexend"');

    const plain = buildReadabilityCss({ fontScale: 100, lineHeight: 1.375, letterSpacing: 0, maxWidth: 0 });
    expect(plain).not.toContain("font-size");
    expect(plain).not.toContain("font-family");

    // Out-of-range or broken numbers are pulled back into range.
    const bad = buildReadabilityCss({ fontScale: 99999, lineHeight: Number.NaN, letterSpacing: -4, maxWidth: -1 });
    expect(bad).toContain("font-size: 300%");
    expect(bad).toContain("line-height: 1 ");
    expect(bad).not.toContain("letter-spacing");
    expect(bad).not.toContain("max-width");
    expect(buildReadabilityCss({ family: 'Evil"; } body { display:none', fontScale: 100, lineHeight: 1.4, letterSpacing: 0, maxWidth: 0 })).not.toContain('"; }');
});

test("RegexTester runs patterns, flags and errors", () => {
    expect(runRegexHere("\\d+", "a1 b22 c333")).toEqual({
        matches: [{ text: "1", index: 1 }, { text: "22", index: 4 }, { text: "333", index: 8 }]
    });
    expect(runRegexHere("/hello/i", "Hello HELLO")).toMatchObject({ matches: [{ text: "Hello" }, { text: "HELLO" }] });
    expect(runRegexHere("(unclosed", "x")).toHaveProperty("error");
    expect(runRegexHere("a".repeat(501), "x")).toEqual({ error: "This pattern is too long to test here." });
    expect((runRegexHere("a", "a".repeat(100)) as { matches: unknown[] }).matches).toHaveLength(50);
});
