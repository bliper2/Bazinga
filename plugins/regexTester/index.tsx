/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import type { Message } from "@vencord/discord-types";
import { TextArea, useEffect, useState } from "@webpack/common";

import { codeBlocks, definePlugin } from "../_bazinga";
import { type RegexResult,runInWorker } from "./test";

const DEBOUNCE_MS = 300;

const Tester = ErrorBoundary.wrap(({ source }: { source: string; }) => {
    const [sample, setSample] = useState("");
    const [result, setResult] = useState<RegexResult | null>(null);

    useEffect(() => {
        if (!sample) return setResult(null);
        let stale = false;
        const timer = setTimeout(() => {
            runInWorker(source.trim(), sample).then(r => !stale && setResult(r));
        }, DEBOUNCE_MS);
        return () => {
            stale = true;
            clearTimeout(timer);
        };
    }, [source, sample]);

    return (
        <div style={{ maxWidth: 520, marginTop: 4, padding: "8px 10px", borderRadius: 6, background: "var(--background-base-lower, var(--background-secondary))", color: "var(--text-default, var(--text-normal))", fontSize: 13 }}>
            <strong>Regex tester</strong> <code>{source.trim()}</code>
            <TextArea value={sample} onChange={setSample} rows={2} placeholder="Type text to test against this pattern…" />
            {result && "error" in result && <div style={{ color: "var(--status-danger, #da373c)" }}>{result.error}</div>}
            {result && "matches" in result && (
                <div>
                    {result.matches.length === 0 ? "No match." : `${result.matches.length} match${result.matches.length === 1 ? "" : "es"}: `}
                    {result.matches.map((m, i) => (
                        <code key={i} style={{ marginRight: 6, background: "var(--background-mod-strong, rgb(128 128 128 / 25%))", padding: "0 4px", borderRadius: 3 }}>
                            {m.text || "(empty)"}
                        </code>
                    ))}
                </div>
            )}
        </div>
    );
}, { noop: true });

export default definePlugin({
    name: "RegexTester",
    description: "Adds a box under ```regex code blocks where you can try the pattern on your own text. Patterns run in a separate thread that is stopped if it takes too long.",
    tags: ["Developers", "Chat"],
    searchTerms: ["regex", "regular expression", "pattern", "test"],

    renderMessageAccessory: props => {
        const message = props.message as Message;
        if (!message.content?.includes("```regex")) return null;
        const block = codeBlocks(message.content, ["regex", "regexp"])[0];
        return block?.trim() ? <Tester source={block} /> : null;
    }
});
