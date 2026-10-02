/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Themes made by orgeco that ship with Bazinga. They are written into the themes folder on startup,
// so they show up in Equicord's Themes tab like any other local theme.
// A theme file is only rewritten when its version here is newer, so edits a user makes are kept.

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const AUTHOR = "orgeco";

interface Palette {
    /** Server list, title bar. */
    bg0: string;
    /** Channel list, member list. */
    bg1: string;
    /** Chat area. */
    bg2: string;
    /** Popouts, menus, message box. */
    bg3: string;
    /** Hover and selected rows. */
    hover: string;
    text: string;
    muted: string;
    strong: string;
    accent: string;
    accentHover: string;
    /** Text drawn on top of the accent color. */
    onAccent: string;
    link: string;
    border: string;
    mention: string;
}

interface BundledTheme {
    file: string;
    name: string;
    description: string;
    version: string;
    palette: Palette;
}

// Bump a theme's version whenever its palette or the shared template below changes,
// otherwise existing installs keep their old file.
const THEMES: BundledTheme[] = [
    {
        file: "Bazinga-Midnight.theme.css",
        name: "Bazinga Midnight",
        description: "Deep navy with warm amber accents. The signature Bazinga look.",
        version: "1.0.0",
        palette: {
            bg0: "#0b0f1a",
            bg1: "#11172a",
            bg2: "#151c33",
            bg3: "#1c2541",
            hover: "#232d4f",
            text: "#d7dcef",
            muted: "#8a93b3",
            strong: "#ffffff",
            accent: "#f5a524",
            accentHover: "#ffb84d",
            onAccent: "#1a1300",
            link: "#ffc861",
            border: "#263055",
            mention: "rgb(245 165 36 / 14%)"
        }
    },
    {
        file: "Orgeco-Neon.theme.css",
        name: "Orgeco Neon",
        description: "Dark violet with electric cyan, for late-night sessions.",
        version: "1.0.0",
        palette: {
            bg0: "#0d0618",
            bg1: "#150b26",
            bg2: "#1b0f31",
            bg3: "#24153f",
            hover: "#2f1c52",
            text: "#e4dcff",
            muted: "#9c8cc9",
            strong: "#ffffff",
            accent: "#00e5ff",
            accentHover: "#5cf0ff",
            onAccent: "#00222a",
            link: "#ff4fd8",
            border: "#341f5c",
            mention: "rgb(0 229 255 / 12%)"
        }
    },
    {
        file: "Orgeco-Mocha.theme.css",
        name: "Orgeco Mocha",
        description: "Cozy coffee browns with soft peach highlights.",
        version: "1.0.0",
        palette: {
            bg0: "#1a1411",
            bg1: "#221a16",
            bg2: "#2a201b",
            bg3: "#352822",
            hover: "#40312a",
            text: "#ecdcd1",
            muted: "#a8928a",
            strong: "#fff6ef",
            accent: "#f2a98a",
            accentHover: "#f7bea6",
            onAccent: "#2a160d",
            link: "#f6c177",
            border: "#46352d",
            mention: "rgb(242 169 138 / 14%)"
        }
    },
    {
        file: "Orgeco-Forest.theme.css",
        name: "Orgeco Forest",
        description: "Deep pine greens with fresh mint accents.",
        version: "1.0.0",
        palette: {
            bg0: "#0c1410",
            bg1: "#111c16",
            bg2: "#15231b",
            bg3: "#1c2e24",
            hover: "#24392d",
            text: "#d6e8dc",
            muted: "#8aa596",
            strong: "#f2fff6",
            accent: "#5ee0a0",
            accentHover: "#86ebb9",
            onAccent: "#04210f",
            link: "#9be37a",
            border: "#284133",
            mention: "rgb(94 224 160 / 13%)"
        }
    },
    {
        file: "Orgeco-Ocean.theme.css",
        name: "Orgeco Ocean",
        description: "Calm deep-sea blues with bright teal accents.",
        version: "1.0.0",
        palette: {
            bg0: "#06121c",
            bg1: "#0a1a27",
            bg2: "#0d2131",
            bg3: "#132c40",
            hover: "#1a3850",
            text: "#d3e7f5",
            muted: "#83a2b8",
            strong: "#f2fbff",
            accent: "#2ec4d6",
            accentHover: "#5fd6e4",
            onAccent: "#00262b",
            link: "#7cc7ff",
            border: "#1d3d56",
            mention: "rgb(46 196 214 / 13%)"
        }
    },
    {
        file: "Orgeco-Sakura.theme.css",
        name: "Orgeco Sakura",
        description: "A light theme of cherry-blossom pinks and cream.",
        version: "1.0.0",
        palette: {
            bg0: "#f3dfe6",
            bg1: "#f9e9ee",
            bg2: "#fff7f9",
            bg3: "#ffffff",
            hover: "#f2d6df",
            text: "#4a2c38",
            muted: "#94707e",
            strong: "#2b1520",
            accent: "#e0577f",
            accentHover: "#c9416a",
            onAccent: "#ffffff",
            link: "#c2386a",
            border: "#ebcbd6",
            mention: "rgb(224 87 127 / 12%)"
        }
    },
    {
        file: "Orgeco-AMOLED.theme.css",
        name: "Orgeco AMOLED",
        description: "Pure black for OLED screens, with crisp white text and a subtle red accent.",
        version: "1.0.0",
        palette: {
            bg0: "#000000",
            bg1: "#000000",
            bg2: "#000000",
            bg3: "#0c0c0c",
            hover: "#161616",
            text: "#e6e6e6",
            muted: "#8c8c8c",
            strong: "#ffffff",
            accent: "#ff3b5c",
            accentHover: "#ff6680",
            onAccent: "#ffffff",
            link: "#ff8a9e",
            border: "#1f1f1f",
            mention: "rgb(255 59 92 / 12%)"
        }
    }
];

function render(theme: BundledTheme) {
    const p = theme.palette;
    return `/**
 * @name ${theme.name}
 * @author ${AUTHOR}
 * @description ${theme.description} Made by ${AUTHOR}.
 * @version ${theme.version}
 * @source https://github.com/bliper2/Bazinga
 */

/* Doubled classes beat Discord's own theme selectors without needing !important. */
:root:root,
.theme-dark.theme-dark,
.theme-darker.theme-darker,
.theme-midnight.theme-midnight,
.theme-light.theme-light {
    --bz-accent: ${p.accent};

    --background-base-lowest: ${p.bg0};
    --background-base-lower: ${p.bg1};
    --background-base-low: ${p.bg2};
    --background-surface-high: ${p.bg3};
    --background-surface-higher: ${p.bg3};
    --background-surface-highest: ${p.hover};
    --background-tertiary: ${p.bg0};
    --background-secondary: ${p.bg1};
    --background-secondary-alt: ${p.bg1};
    --background-primary: ${p.bg2};
    --background-floating: ${p.bg3};
    --background-nested-floating: ${p.bg3};
    --chat-background-default: ${p.bg2};
    --channeltextarea-background: ${p.bg3};
    --input-background: ${p.bg3};
    --input-background-default: ${p.bg3};
    --input-border-default: ${p.border};
    --input-border-hover: ${p.accent};
    --input-border-active: ${p.accent};
    --input-text-default: ${p.text};
    --input-placeholder-text-default: ${p.muted};
    --input-icon-default: ${p.muted};
    --input-border: ${p.border};
    --modal-background: ${p.bg2};
    --modal-footer-background: ${p.bg1};
    --home-background: ${p.bg2};
    --app-frame-background: ${p.bg0};
    --bg-base-primary: ${p.bg2};
    --bg-base-secondary: ${p.bg1};
    --bg-base-tertiary: ${p.bg0};
    --bg-surface-raised: ${p.bg3};
    --bg-surface-overlay: ${p.bg3};

    --background-mod-subtle: ${p.hover};
    --background-mod-normal: ${p.hover};
    --background-mod-strong: ${p.hover};
    --background-modifier-hover: ${p.hover};
    --background-modifier-selected: ${p.hover};
    --background-modifier-active: ${p.hover};
    --background-message-hover: color-mix(in srgb, ${p.hover} 55%, transparent);
    --background-mentioned: ${p.mention};
    --background-mentioned-hover: ${p.mention};

    --text-default: ${p.text};
    --text-normal: ${p.text};
    --text-secondary: ${p.muted};
    --text-muted: ${p.muted};
    --text-strong: ${p.strong};
    --header-primary: ${p.strong};
    --header-secondary: ${p.muted};
    --channels-default: ${p.muted};
    --interactive-normal: ${p.muted};
    --interactive-muted: color-mix(in srgb, ${p.muted} 55%, transparent);
    --interactive-hover: ${p.text};
    --interactive-active: ${p.strong};
    --interactive-text-default: ${p.muted};
    --interactive-text-hover: ${p.text};
    --interactive-text-active: ${p.strong};
    --icon-default: ${p.muted};
    --icon-strong: ${p.strong};
    --text-link: ${p.link};

    --brand-500: ${p.accent};
    --brand-560: ${p.accentHover};
    --brand-600: ${p.accentHover};
    --brand-experiment: ${p.accent};
    --brand-experiment-560: ${p.accentHover};
    --brand-experiment-600: ${p.accentHover};
    --background-brand: ${p.accent};
    --text-brand: ${p.accent};
    --control-brand-foreground: ${p.accent};
    --control-brand-foreground-new: ${p.accent};
    --control-primary-background-default: ${p.accent};
    --control-primary-background-hover: ${p.accentHover};
    --control-primary-background-active: ${p.accentHover};
    --control-primary-text-default: ${p.onAccent};
    --control-primary-text-hover: ${p.onAccent};
    --control-primary-text-active: ${p.onAccent};
    --button-filled-brand-background: ${p.accent};
    --button-filled-brand-background-hover: ${p.accentHover};
    --button-filled-brand-text: ${p.onAccent};

    --border-subtle: ${p.border};
    --border-normal: ${p.border};
    --border-faint: ${p.border};
    --border-strong: ${p.border};
    --scrollbar-auto-thumb: ${p.hover};
    --scrollbar-auto-track: transparent;
    --scrollbar-thin-thumb: ${p.hover};
    --scrollbar-thin-track: transparent;
}

::selection {
    background: color-mix(in srgb, ${p.accent} 35%, transparent);
}
`;
}

function installedVersion(path: string) {
    try {
        return /@version\s+(\S+)/.exec(readFileSync(path, "utf-8"))?.[1] ?? null;
    } catch {
        return null;
    }
}

/** Compares "1.2.3" style versions. */
function isNewer(next: string, current: string) {
    const a = next.split(".").map(Number);
    const b = current.split(".").map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
    }
    return false;
}

export function installBundledThemes(themesDir: string) {
    for (const theme of THEMES) {
        const path = join(themesDir, theme.file);
        try {
            const current = existsSync(path) ? installedVersion(path) : null;
            if (current && !isNewer(theme.version, current)) continue;
            writeFileSync(path, render(theme));
        } catch (err) {
            console.error(`Failed to install bundled theme ${theme.name}:`, err);
        }
    }
}
