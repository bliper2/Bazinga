/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test } from "bun:test";

import { daysUntil, describeDays, parseBirthdays } from "../plugins/birthdayReminders/birthdays";
import { allTags, type Bookmark, bookmarksToMarkdown, filterBookmarks, parseTags } from "../plugins/bookmarkTags/bookmarks";
import { buildIcs, escapeText, foldLine, formatUtc } from "../plugins/calendarEvents/ics";
import { buildLabelCss, LABEL_COLORS } from "../plugins/colorLabels/css";
import { formatRemaining, summarizeHeld } from "../plugins/focusSessions/session";
import { addTodo, openCount, removeTodo, toggleTodo } from "../plugins/messageTodos/todos";
import { pushRecent } from "../plugins/recentChannels/recent";
import { addUsage, dayKey, formatDuration, secondsToday, totalsForLast } from "../plugins/usageStats/usage";
import { hiddenFor, normalizeName, toggleMember } from "../plugins/workspaceProfiles/workspaces";

test("bookmark tags are cleaned, de-duplicated and limited", () => {
    expect(parseTags("Work, Ideas  to-read #Work")).toEqual(["work", "ideas", "to-read"]);
    expect(parseTags("")).toEqual([]);
    expect(parseTags("a b c d e f g h i j")).toHaveLength(8);
    expect(parseTags("<script>x</script>")).toEqual(["scriptxscript"]);
});

test("bookmarks can be searched, filtered, counted and exported", () => {
    const make = (id: string, tags: string[], savedAt: number, preview = "hello"): Bookmark => ({
        messageId: id, channelId: "20", guildId: id === "3" ? null : "10", author: "Ann", preview, tags, savedAt
    });
    const list = [make("1", ["work"], 1, "plan the launch"), make("2", ["work", "ideas"], 3), make("3", [], 2, "lunch")];

    expect(filterBookmarks(list, "", null).map(b => b.messageId)).toEqual(["2", "3", "1"]);
    expect(filterBookmarks(list, "lunch", null).map(b => b.messageId)).toEqual(["3"]);
    expect(filterBookmarks(list, "", "ideas").map(b => b.messageId)).toEqual(["2"]);
    expect(filterBookmarks(list, "idea", null).map(b => b.messageId)).toEqual(["2"]);
    expect(allTags(list)).toEqual([["work", 2], ["ideas", 1]]);
    expect(bookmarksToMarkdown([list[1], list[2]])).toBe(
        "- **Ann**: hello ([jump](https://discord.com/channels/10/20/2)) #work #ideas\n- **Ann**: lunch ([jump](https://discord.com/channels/@me/20/3))"
    );
});

test("calendar files escape text, fold long lines and cover missing end times", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(formatUtc(new Date("2026-10-05T18:30:00.000Z"))).toBe("20261005T183000Z");

    const long = foldLine("X".repeat(160));
    const parts = long.split("\r\n ");
    expect(parts[0].length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every(part => part.length <= 74)).toBe(true);
    expect(long.replace(/\r\n /g, "")).toBe("X".repeat(160));
    // Multi-byte characters are never cut in half.
    expect(foldLine("é".repeat(80)).replace(/\r\n /g, "")).toBe("é".repeat(80));

    const ics = buildIcs(
        [
            { id: "1", name: "Movie, night", start: "2026-10-05T18:00:00Z", end: null, url: "https://discord.com/events/1/1" },
            { id: "2", name: "Broken", start: "not a date", url: "https://discord.com/events/1/2" }
        ],
        new Date("2026-10-01T00:00:00Z")
    );
    expect(ics).toContain("SUMMARY:Movie\\, night");
    expect(ics).toContain("DTEND:20261005T190000Z");
    expect(ics).not.toContain("Broken");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
});

test("color labels only produce CSS for known colors and numeric ids", () => {
    const css = buildLabelCss({
        guilds: { "123": LABEL_COLORS.Red, "abc": LABEL_COLORS.Red, "456": "red; } body { display: none" },
        channels: { "789": LABEL_COLORS.Blue, "1\"]{": LABEL_COLORS.Blue }
    });
    expect(css).toContain('guildsnav___123');
    expect(css).toContain('channels___789');
    expect(css).not.toContain("abc");
    expect(css).not.toContain("456");
    expect(css).not.toContain("display: none");
    expect(css).not.toContain('1"]{');
});

test("focus session timer and summary read well", () => {
    expect(formatRemaining(24 * 60_000 + 5_000)).toBe("24:05");
    expect(formatRemaining(3_723_000)).toBe("1:02:03");
    expect(formatRemaining(-5)).toBe("0:00");
    expect(summarizeHeld([])).toBe("");
    expect(summarizeHeld(["Ann"])).toBe("1 notification from Ann");
    expect(summarizeHeld(["Ann", "Ann", "Bob"])).toBe("3 notifications from Ann and Bob");
    expect(summarizeHeld(["A", "B", "C", "D", "E"])).toBe("5 notifications from A, B, C and 2 others");
});

test("to-do list adds, completes, removes and only accepts message links", () => {
    let list = addTodo([], { text: "  Reply   to\nAnn  " , link: "/channels/1/2/3" });
    expect(list[0]).toMatchObject({ text: "Reply to Ann", done: false, link: "/channels/1/2/3" });
    list = addTodo(list, { text: "Bad link", link: "https://evil.example" });
    expect(list[0].link).toBeUndefined();
    expect(addTodo(list, { text: "   " })).toBe(list);

    expect(openCount(list)).toBe(2);
    list = toggleTodo(list, list[1].id);
    expect(openCount(list)).toBe(1);
    list = removeTodo(list, list[0].id);
    expect(list).toHaveLength(1);
});

test("birthdays are parsed and counted down, including Feb 29", () => {
    const { birthdays, bad } = parseBirthdays("Sam 03-14\nAlex, 11/02\nNope 13-40\ngarbage\n");
    expect(birthdays).toEqual([{ name: "Sam", month: 3, day: 14 }, { name: "Alex", month: 11, day: 2 }]);
    expect(bad).toEqual(["Nope 13-40", "garbage"]);

    const now = new Date(2026, 9, 5, 15, 0);
    expect(daysUntil({ name: "x", month: 10, day: 5 }, now)).toBe(0);
    expect(daysUntil({ name: "x", month: 10, day: 6 }, now)).toBe(1);
    expect(daysUntil({ name: "x", month: 10, day: 4 }, now)).toBe(364);
    expect(daysUntil({ name: "x", month: 2, day: 29 }, new Date(2026, 1, 20))).toBe(9);
    expect(describeDays(0)).toBe("today");
    expect(describeDays(1)).toBe("tomorrow");
    expect(describeDays(5)).toBe("in 5 days");
});

test("usage is added per day and place, summed over a range and pruned", () => {
    const day1 = new Date(2026, 9, 5, 12);
    const day2 = new Date(2026, 9, 6, 12);
    let usage = addUsage({}, "10", 10, day1);
    usage = addUsage(usage, "10", 10, day1);
    usage = addUsage(usage, "dm", 30, day2);

    expect(usage[dayKey(day1)]).toEqual({ "10": 20 });
    expect(secondsToday(usage, day2)).toBe(30);
    expect(totalsForLast(usage, 1, day2)).toEqual([["dm", 30]]);
    expect(totalsForLast(usage, 2, day2)).toEqual([["dm", 30], ["10", 20]]);

    const old = addUsage(usage, "10", 10, new Date(2027, 5, 1));
    expect(Object.keys(old)).toEqual(["2027-06-01"]);
    expect(formatDuration(20)).toBe("under a minute");
    expect(formatDuration(3_900)).toBe("1 h 5 min");
});

test("workspaces hide the servers that are not members", () => {
    expect(hiddenFor(["1", "2", "3"], ["2"])).toEqual(["1", "3"]);
    const workspace = { name: "Work", guildIds: ["1"] };
    expect(toggleMember(workspace, "2").guildIds).toEqual(["1", "2"]);
    expect(toggleMember(workspace, "1").guildIds).toEqual([]);
    expect(normalizeName("  Work   stuff  ")).toBe("Work stuff");
});

test("recent channels keep the newest first, once each, up to the limit", () => {
    expect(pushRecent(["a", "b", "c"], "b", 5)).toEqual(["b", "a", "c"]);
    expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
    expect(pushRecent([], "x", 0)).toEqual(["x"]);
});
