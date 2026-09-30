/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// A live preview applies a theme's CSS without installing it, until it is stopped.

const STYLE_ID = "bazinga-bd-theme-preview";

export function startPreview(css: string) {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        document.head.append(style);
    }
    style.textContent = css;
}

export function stopPreview() {
    document.getElementById(STYLE_ID)?.remove();
}
