/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

const SHORTENERS = new Set([
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "v.gd", "ow.ly", "buff.ly", "rebrand.ly", "cutt.ly",
    "shorturl.at", "tiny.cc", "t.ly", "rb.gy", "bit.do", "lnkd.in", "s.id", "short.io", "clck.ru", "tr.ee"
]);

const MAX_HOPS = 8;
const TIMEOUT_MS = 8000;

/** True for names that point at this computer or the local network, which a link in chat must never make us contact. */
function isPrivateHost(host: string) {
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
    if (host.includes(":")) return true; // IPv6 literal
    const ip = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
    if (!ip) return false;
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export interface ExpandResult {
    /** Every address visited, starting with the one given. */
    chain: string[];
    /** Set when following stopped early. */
    problem?: string;
}

/**
 * Follows a short link's redirects one step at a time, asking only for headers, and reports where it ends up.
 * Only well-known link shorteners are contacted first, and hops to local addresses are refused.
 */
export async function expandLink(_: IpcMainInvokeEvent, link: string): Promise<ExpandResult> {
    let url: URL;
    try {
        url = new URL(link);
    } catch {
        return { chain: [], problem: "That is not a valid link." };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return { chain: [], problem: "Only web links can be checked." };
    if (!SHORTENERS.has(url.hostname.replace(/^www\./, ""))) return { chain: [], problem: "This is not a known link shortener." };

    const chain = [url.href];
    for (let hop = 0; hop < MAX_HOPS; hop++) {
        let response: Response;
        try {
            response = await fetch(url, {
                method: "HEAD",
                redirect: "manual",
                signal: AbortSignal.timeout(TIMEOUT_MS),
                credentials: "omit" as RequestCredentials
            });
        } catch {
            return { chain, problem: "The link did not respond." };
        }

        const location = response.headers.get("location");
        if (response.status < 300 || response.status >= 400 || !location) return { chain };

        try {
            url = new URL(location, url);
        } catch {
            return { chain, problem: "The link redirects to an invalid address." };
        }
        if (url.protocol !== "https:" && url.protocol !== "http:") return { chain, problem: "The link redirects to a non-web address." };
        chain.push(url.href);
        if (isPrivateHost(url.hostname)) return { chain, problem: "The link redirects to an address on a local network." };
    }
    return { chain, problem: "The link redirects too many times." };
}
