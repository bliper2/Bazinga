/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Turns a set of colors into a Discord theme file. The app uses it for the themes it ships, and it is copied into
// the plugins at build time (see scripts/build/buildEquicord.mts) so Theme Studio makes files of exactly the same kind.

export interface Palette {
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

export interface ThemeMeta {
    name: string;
    author: string;
    description: string;
    version: string;
}

export const PALETTE_FIELDS: { key: keyof Palette; label: string }[] = [
    { key: "bg0", label: "Server list and title bar" },
    { key: "bg1", label: "Channel and member lists" },
    { key: "bg2", label: "Chat" },
    { key: "bg3", label: "Menus and message box" },
    { key: "hover", label: "Hover and selected rows" },
    { key: "text", label: "Text" },
    { key: "muted", label: "Quiet text" },
    { key: "strong", label: "Headings" },
    { key: "accent", label: "Accent" },
    { key: "accentHover", label: "Accent when hovered" },
    { key: "onAccent", label: "Text on accent" },
    { key: "link", label: "Links" },
    { key: "border", label: "Borders" },
    { key: "mention", label: "Mention highlight" }
];

const COLOR = /^(#[0-9a-f]{3,8}|(?:rgba?|hsla?)\([\d\s.,/%a-z]+\))$/i;

/** Colors end up inside a stylesheet, so anything that is not a plain color is refused. */
function checkedPalette(palette: Palette): Palette {
    for (const [key, value] of Object.entries(palette)) {
        if (typeof value !== "string" || !COLOR.test(value.trim())) throw new Error(`"${key}" is not a valid color`);
    }
    return palette;
}

/** Keeps text on one line and out of the comment's end marker, since it is written into a comment. */
const oneLine = (text: string) => text.replace(/\*\//g, "").replace(/\s+/g, " ").trim();

export function renderTheme(meta: ThemeMeta, palette: Palette) {
    const p = checkedPalette(palette);
    return `/**
 * @name ${oneLine(meta.name)}
 * @author ${oneLine(meta.author)}
 * @description ${oneLine(meta.description)}
 * @version ${oneLine(meta.version)}
 * @source https://github.com/bliper2/Bazinga
 */

/*
 * Accent color. To use your own, add this to QuickCSS (Settings > Themes > Edit QuickCSS):
 *   html:root { --bz-accent: #ff66aa; --bz-accent-hover: #ff8cc0; }
 */
:root {
    --bz-accent: ${p.accent};
    --bz-accent-hover: ${p.accentHover};
}

/* Doubled classes beat Discord's own theme selectors without needing !important. */
:root:root,
.theme-dark.theme-dark,
.theme-darker.theme-darker,
.theme-midnight.theme-midnight,
.theme-light.theme-light {
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
    --input-border-hover: var(--bz-accent);
    --input-border-active: var(--bz-accent);
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

    --brand-500: var(--bz-accent);
    --brand-560: var(--bz-accent-hover);
    --brand-600: var(--bz-accent-hover);
    --brand-experiment: var(--bz-accent);
    --brand-experiment-560: var(--bz-accent-hover);
    --brand-experiment-600: var(--bz-accent-hover);
    --background-brand: var(--bz-accent);
    --text-brand: var(--bz-accent);
    --control-brand-foreground: var(--bz-accent);
    --control-brand-foreground-new: var(--bz-accent);
    --control-primary-background-default: var(--bz-accent);
    --control-primary-background-hover: var(--bz-accent-hover);
    --control-primary-background-active: var(--bz-accent-hover);
    --control-primary-text-default: ${p.onAccent};
    --control-primary-text-hover: ${p.onAccent};
    --control-primary-text-active: ${p.onAccent};
    --button-filled-brand-background: var(--bz-accent);
    --button-filled-brand-background-hover: var(--bz-accent-hover);
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
    background: color-mix(in srgb, var(--bz-accent) 35%, transparent);
}
`;
}
