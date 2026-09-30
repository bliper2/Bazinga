/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Offline heuristics for links that pretend to be something they are not. No network requests.

export interface LinkCheckOptions {
    punycode: boolean;
    ipAddress: boolean;
    mismatchedText: boolean;
    lookalike: boolean;
    trustedDomains: string[];
}

/** Brands that phishing links imitate most often in Discord, with their real domains. */
const BRANDS: Record<string, { keyword: string; domains: string[]; }> = {
    Discord: {
        keyword: "discord",
        domains: [
            "discord.com", "discord.gg", "discordapp.com", "discordapp.net", "discord.media", "discord.new",
            "discord.gift", "discord.dev", "discord.co", "discordstatus.com", "dis.gd"
        ]
    },
    Steam: { keyword: "steam", domains: ["steampowered.com", "steamcommunity.com", "steamstatic.com", "steam.tv", "s.team"] },
    GitHub: { keyword: "github", domains: ["github.com", "github.io", "githubusercontent.com", "github.dev", "githubassets.com"] },
    PayPal: { keyword: "paypal", domains: ["paypal.com", "paypal.me", "paypalobjects.com"] },
    "Epic Games": { keyword: "epicgames", domains: ["epicgames.com", "unrealengine.com"] },
    Roblox: { keyword: "roblox", domains: ["roblox.com", "rbxcdn.com"] },
    Twitch: { keyword: "twitch", domains: ["twitch.tv", "twitchcdn.net"] },
    Spotify: { keyword: "spotify", domains: ["spotify.com", "spotify.link", "scdn.co"] },
    Microsoft: { keyword: "microsoft", domains: ["microsoft.com", "microsoftonline.com", "live.com", "xbox.com", "office.com"] }
};

/** Collapses characters that look alike, so "dlsc0rd" and "discord" compare equal. */
function skeleton(text: string) {
    return text
        .toLowerCase()
        .replace(/rn/g, "m")
        .replace(/vv/g, "w")
        .replace(/[1i|!]/g, "l")
        .replace(/0/g, "o")
        .replace(/3/g, "e")
        .replace(/4|@/g, "a")
        .replace(/5|\$/g, "s")
        .replace(/7/g, "t")
        .replace(/[^a-z]/g, "");
}

/** Edit distance that counts swapping two neighbouring letters as one edit. */
function editDistance(a: string, b: string) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
        }
    }
    return d[a.length][b.length];
}

const stripWww = (host: string) => host.replace(/^www\./, "");
const isOnDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

function looksLikeUrl(text: string) {
    return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(text);
}

function lookalikeReason(host: string): string | null {
    const labels = host.split(".");
    // The part people read as the site name, e.g. "discord" in "discord.com". Rough, but good enough offline.
    const siteLabel = skeleton(labels.length > 1 ? labels[labels.length - 2] : labels[0]);
    const hostSkeleton = skeleton(labels.slice(0, -1).join(""));

    for (const [brand, { keyword, domains }] of Object.entries(BRANDS)) {
        if (domains.some(d => isOnDomain(host, d))) return null;

        const brandSkeleton = skeleton(keyword);
        if (hostSkeleton.includes(brandSkeleton)) {
            return `The address mentions ${brand}, but it is not an official ${brand} domain.`;
        }
        const allowedEdits = brandSkeleton.length >= 6 ? 2 : 1;
        if (siteLabel.length >= 4 && editDistance(siteLabel, brandSkeleton) <= allowedEdits) {
            return `The address looks like ${brand} but is spelled differently.`;
        }
    }
    return null;
}

/** Returns the reasons a link looks suspicious. An empty list means no warning. */
export function checkLink(href: string, linkText: string, options: LinkCheckOptions): string[] {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return [];
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return [];

    const host = stripWww(url.hostname.toLowerCase());
    if (options.trustedDomains.some(d => isOnDomain(host, d))) return [];
    if (BRANDS.Discord.domains.some(d => isOnDomain(host, d))) return [];

    const reasons: string[] = [];

    if (options.punycode && host.split(".").some(label => label.startsWith("xn--"))) {
        reasons.push("The address uses international characters (punycode), which can imitate other sites.");
    }

    if (options.ipAddress && (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("["))) {
        reasons.push("The link points to a raw IP address instead of a named site.");
    }

    const text = linkText.trim();
    if (options.mismatchedText && text !== href && looksLikeUrl(text)) {
        try {
            const shownHost = stripWww(new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`).hostname.toLowerCase());
            if (shownHost !== host) reasons.push(`The link text shows ${shownHost}, but it opens ${host}.`);
        } catch {
            // Text only looked like a URL.
        }
    }

    if (options.lookalike) {
        const reason = lookalikeReason(host);
        if (reason) reasons.push(reason);
    }

    return reasons;
}
