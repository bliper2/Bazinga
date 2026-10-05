/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// This tests the logic of the plugin template, and shows how to test a plugin of your own.

import { expect, test } from "bun:test";

import { countWords } from "../plugins/_template/logic";

test("the template counts words and skips links and code", () => {
    expect(countWords("one two  three")).toBe(3);
    expect(countWords("see https://example.com now")).toBe(2);
    expect(countWords("```\ncode block\n``` after")).toBe(1);
    expect(countWords("   ")).toBe(0);
    expect(countWords("— ! ?")).toBe(0);
});
