/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// KaTeX is loaded on first use from jsDelivr, which Equicord's CSP already allows.
// The version is pinned and checked with Subresource Integrity, so a changed file is refused.
const VERSION = "0.18.10";
const BASE = `https://cdn.jsdelivr.net/npm/katex@${VERSION}/dist`;
const SCRIPT_INTEGRITY = "sha384-oeXTyN/gxEn/v98/oDFW+7XVfZrp59R6Tporzsg2uNs9g+G9Xel/Afxdamc4Mags";
const STYLE_INTEGRITY = "sha384-rdqqrpVNEfmY6hsVFS50HU5L84tWeMdr4XpF+TJPvLR6e8YxPgRyDzzpawPHMQE6";

export interface Katex {
    renderToString(tex: string, options: Record<string, unknown>): string;
}

let loading: Promise<Katex> | null = null;

function addElement<T extends HTMLScriptElement | HTMLLinkElement>(el: T) {
    return new Promise<void>((resolve, reject) => {
        el.crossOrigin = "anonymous";
        el.onload = () => resolve();
        el.onerror = () => {
            el.remove();
            reject(new Error(`Failed to load ${"src" in el ? el.src : el.href}`));
        };
        document.head.append(el);
    });
}

export function loadKatex(): Promise<Katex> {
    if ((window as any).katex) return Promise.resolve((window as any).katex);

    loading ??= (async () => {
        const style = document.createElement("link");
        style.rel = "stylesheet";
        style.href = `${BASE}/katex.min.css`;
        style.integrity = STYLE_INTEGRITY;

        const script = document.createElement("script");
        script.src = `${BASE}/katex.min.js`;
        script.integrity = SCRIPT_INTEGRITY;

        await Promise.all([addElement(style), addElement(script)]);
        return (window as any).katex as Katex;
    })().catch(err => {
        // Let a later message try again, for example after the network comes back.
        loading = null;
        throw err;
    });

    return loading;
}
