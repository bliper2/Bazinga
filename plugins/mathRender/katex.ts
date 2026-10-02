/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { loadFromCdn } from "../_bazinga";

// KaTeX is loaded on first use. The version is pinned and checked with Subresource Integrity.
const BASE = "https://cdn.jsdelivr.net/npm/katex@0.18.10/dist";

export interface Katex {
    renderToString(tex: string, options: Record<string, unknown>): string;
}

export async function loadKatex(): Promise<Katex> {
    await Promise.all([
        loadFromCdn(`${BASE}/katex.min.css`, "sha384-rdqqrpVNEfmY6hsVFS50HU5L84tWeMdr4XpF+TJPvLR6e8YxPgRyDzzpawPHMQE6"),
        loadFromCdn(`${BASE}/katex.min.js`, "sha384-oeXTyN/gxEn/v98/oDFW+7XVfZrp59R6Tporzsg2uNs9g+G9Xel/Afxdamc4Mags")
    ]);
    return (window as any).katex;
}
