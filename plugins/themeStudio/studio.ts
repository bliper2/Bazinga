/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface StudioColors {
    bg0: string;
    bg1: string;
    bg2: string;
    bg3: string;
    hover: string;
    text: string;
    muted: string;
    strong: string;
    accent: string;
    onAccent: string;
    link: string;
    border: string;
}

export const PRESETS: Record<string, StudioColors> = {
    Dark: {
        bg0: "#0b0f1a", bg1: "#11172a", bg2: "#151c33", bg3: "#1c2541", hover: "#232d4f",
        text: "#d7dcef", muted: "#8a93b3", strong: "#ffffff", accent: "#f5a524", onAccent: "#1a1300",
        link: "#ffc861", border: "#263055"
    },
    Light: {
        bg0: "#e3e8f0", bg1: "#edf0f6", bg2: "#fafbfd", bg3: "#ffffff", hover: "#dde3ee",
        text: "#1f2937", muted: "#667085", strong: "#0b1220", accent: "#3b6fd4", onAccent: "#ffffff",
        link: "#2f5fc0", border: "#d3dae6"
    },
    Black: {
        bg0: "#000000", bg1: "#000000", bg2: "#000000", bg3: "#0c0c0c", hover: "#161616",
        text: "#e6e6e6", muted: "#8c8c8c", strong: "#ffffff", accent: "#ff3b5c", onAccent: "#ffffff",
        link: "#ff8a9e", border: "#1f1f1f"
    }
};

export const COLOR_FIELDS: { key: keyof StudioColors; label: string; }[] = [
    { key: "bg0", label: "Server list and title bar" },
    { key: "bg1", label: "Channel and member lists" },
    { key: "bg2", label: "Chat" },
    { key: "bg3", label: "Menus and message box" },
    { key: "hover", label: "Hover and selected rows" },
    { key: "text", label: "Text" },
    { key: "muted", label: "Quiet text" },
    { key: "strong", label: "Headings" },
    { key: "accent", label: "Accent (buttons, highlights)" },
    { key: "onAccent", label: "Text on the accent" },
    { key: "link", label: "Links" },
    { key: "border", label: "Borders" }
];

const HEX = /^#[0-9a-f]{6}$/i;

export const isHex = (value: string) => HEX.test(value);

function channels(hex: string): [number, number, number] {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Moves a color toward white (amount above 0) or black (below 0). Amount is from -1 to 1. */
export function shade(hex: string, amount: number) {
    const target = amount >= 0 ? 255 : 0;
    const weight = Math.min(1, Math.abs(amount));
    return `#${channels(hex)
        .map(c => Math.round(c + (target - c) * weight).toString(16).padStart(2, "0"))
        .join("")}`;
}

/** A light-or-dark check, so the accent hover goes the way that stays visible. */
export function isDark(hex: string) {
    const [r, g, b] = channels(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

/** The accent hover color and the mention highlight, worked out from the accent so the user picks fewer colors. */
export function deriveAccent(accent: string) {
    return {
        accentHover: shade(accent, isDark(accent) ? 0.2 : -0.15),
        // An 8-digit hex with about 14% opacity.
        mention: `${accent}24`
    };
}

/** A file-name-safe version of a theme name. */
export function slugify(name: string) {
    return name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w ()-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 40);
}

export const themeFileName = (name: string) => `Studio-${slugify(name) || "My-theme"}.theme.css`;
