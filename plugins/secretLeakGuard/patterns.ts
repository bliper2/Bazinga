/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Well-known credential formats. Matching is done on the message the user is about to send, nothing else.
const PATTERNS: [string, RegExp][] = [
    ["a Discord token", /\b[MNO][A-Za-z\d_-]{23,27}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,}\b/],
    ["a private key", /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
    ["an AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
    ["a GitHub token", /\b(?:gh[pousr]_[A-Za-z\d]{36,}|github_pat_[A-Za-z\d_]{40,})\b/],
    ["a GitLab token", /\bglpat-[A-Za-z\d_-]{20,}\b/],
    ["an OpenAI API key", /\bsk-(?:proj-)?[A-Za-z\d_-]{32,}\b/],
    ["an Anthropic API key", /\bsk-ant-[A-Za-z\d_-]{32,}\b/],
    ["a Google API key", /\bAIza[\dA-Za-z_-]{35}\b/],
    ["a Slack token", /\bxox[abposr]-[A-Za-z\d-]{10,}\b/],
    ["a Stripe secret key", /\b(?:sk|rk)_live_[A-Za-z\d]{20,}\b/],
    ["a JSON Web Token", /\beyJ[A-Za-z\d_-]{10,}\.eyJ[A-Za-z\d_-]{10,}\.[A-Za-z\d_-]{10,}\b/],
    ["a webhook URL", /https:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]{20,}/]
];

const PASSWORD = /\b(?:password|passwd|pwd|passcode)\s*[:=]\s*\S{4,}/i;

// 13 to 19 digits, optionally grouped with spaces or dashes.
const CARD_CANDIDATE = /\b\d(?:[ -]?\d){12,18}\b/g;

function passesLuhn(digits: string) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        let d = Number(digits[digits.length - 1 - i]);
        if (i % 2 === 1) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
    }
    return sum % 10 === 0;
}

function hasCardNumber(text: string) {
    for (const match of text.matchAll(CARD_CANDIDATE)) {
        const digits = match[0].replace(/\D/g, "");
        // Skip Discord IDs (snowflakes), which are long digit runs without separators.
        if (digits.length >= 17 && digits === match[0]) continue;
        if (passesLuhn(digits)) return true;
    }
    return false;
}

const SENSITIVE_FILE = /(^|\/)(\.env(\..+)?|id_(rsa|dsa|ecdsa|ed25519)|credentials(\.json)?|secrets?\.(json|ya?ml|toml)|\.npmrc|\.pypirc|\.netrc|wallet\.dat)$|\.(pem|key|p12|pfx|ppk|kdbx|keystore|jks)$/i;

/** True for file names that usually hold passwords or private keys. */
export function isSensitiveFileName(fileName: string) {
    return SENSITIVE_FILE.test(fileName.trim());
}

/** Returns a description of each kind of secret found in the text. */
export function findSecrets(text: string, options: { cards: boolean; passwords: boolean; }) {
    const found = PATTERNS.filter(([, re]) => re.test(text)).map(([kind]) => kind);
    if (options.passwords && PASSWORD.test(text)) found.push("a password");
    if (options.cards && hasCardNumber(text)) found.push("a payment card number");
    return found;
}
