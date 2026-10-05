/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type RegexResult = { error: string; } | { matches: { text: string; index: number; }[]; };

/**
 * The code that runs a pattern. It is kept as text so the same code runs in a worker (see runInWorker) and in tests.
 * Accepts `/pattern/flags` or a bare pattern. The pattern comes from someone else's message, so its length and the
 * sample length are capped.
 */
export const REGEX_RUNNER_SOURCE = `
function run(source, sample) {
    const MAX_PATTERN = 500, MAX_SAMPLE = 5000, MAX_MATCHES = 50;
    const literal = /^\\/(.+)\\/([a-z]*)$/s.exec(source);
    const pattern = literal ? literal[1] : source;
    const flags = (literal ? literal[2] : "").replace(/[^dgimsuvy]/g, "");
    if (pattern.length > MAX_PATTERN) return { error: "This pattern is too long to test here." };

    let regex;
    try {
        regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Invalid pattern" };
    }

    const matches = [];
    for (const match of sample.slice(0, MAX_SAMPLE).matchAll(regex)) {
        matches.push({ text: match[0], index: match.index || 0 });
        if (matches.length >= MAX_MATCHES) break;
    }
    return { matches };
}
`;

/** For tests. Do not call this on the page: a slow pattern would freeze it. */
export const runRegexHere = new Function(`${REGEX_RUNNER_SOURCE}; return run;`)() as (source: string, sample: string) => RegexResult;

const TIMEOUT_MS = 1000;

/** Runs the pattern in a separate thread that is stopped if it takes too long, so a bad pattern cannot freeze Discord. */
export function runInWorker(source: string, sample: string): Promise<RegexResult> {
    return new Promise(resolve => {
        const url = URL.createObjectURL(
            new Blob([`${REGEX_RUNNER_SOURCE}; onmessage = e => postMessage(run(e.data.source, e.data.sample));`], {
                type: "text/javascript"
            })
        );
        const worker = new Worker(url);
        const finish = (result: RegexResult) => {
            clearTimeout(timer);
            worker.terminate();
            URL.revokeObjectURL(url);
            resolve(result);
        };
        const timer = setTimeout(() => finish({ error: "This pattern took too long and was stopped." }), TIMEOUT_MS);

        worker.onmessage = e => finish(e.data);
        worker.onerror = () => finish({ error: "The pattern could not be tested." });
        worker.postMessage({ source, sample });
    });
}
