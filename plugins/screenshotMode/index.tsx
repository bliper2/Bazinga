/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EyeIcon } from "@components/Icons";
import { OptionType } from "@utils/types";
import { showToast, Toasts, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, guard, matchesShortcut } from "../_bazinga";
import managedStyle from "./styles.css?managed";

const logger = bazingaLogger("ScreenshotMode");

const PARTS = ["avatars", "names", "messages", "servers"] as const;

const settings = definePluginSettings({
    shortcut: {
        type: OptionType.STRING,
        description: "Keyboard shortcut that turns screenshot mode on and off, like Ctrl+Shift+B. Leave empty for none",
        default: "Ctrl+Shift+B"
    },
    avatars: { type: OptionType.BOOLEAN, description: "Blur profile pictures", default: true, onChange: () => applyClasses() },
    names: { type: OptionType.BOOLEAN, description: "Blur usernames and nicknames", default: true, onChange: () => applyClasses() },
    messages: { type: OptionType.BOOLEAN, description: "Blur message text and images", default: false, onChange: () => applyClasses() },
    servers: { type: OptionType.BOOLEAN, description: "Blur server icons", default: false, onChange: () => applyClasses() },
    revealOnHover: {
        type: OptionType.BOOLEAN,
        description: "Show a blurred item while the mouse is over it",
        default: true,
        onChange: () => applyClasses()
    }
});

let active = false;
const listeners = new Set<(active: boolean) => void>();

function applyClasses() {
    const root = document.documentElement.classList;
    root.toggle("bz-screenshot-mode", active);
    for (const part of PARTS) root.toggle(`bz-ss-${part}`, active && settings.store[part]);
    root.toggle("bz-ss-hover", active && settings.store.revealOnHover);
}

function setActive(value: boolean) {
    active = value;
    applyClasses();
    listeners.forEach(l => l(active));
    showToast(active ? "Screenshot mode on" : "Screenshot mode off", Toasts.Type.MESSAGE);
}

const onKeyDown = guard(logger, "Failed to handle shortcut", (e: KeyboardEvent) => {
    if (!matchesShortcut(e, settings.store.shortcut)) return;
    e.preventDefault();
    setActive(!active);
});

const ToggleButton = ErrorBoundary.wrap(() => {
    const { shortcut } = settings.use(["shortcut"]);
    const [isActive, setIsActive] = useState(active);
    useEffect(() => {
        listeners.add(setIsActive);
        return () => void listeners.delete(setIsActive);
    }, []);

    return (
        <HeaderBarButton
            icon={EyeIcon}
            tooltip={`Screenshot mode${shortcut ? ` (${shortcut})` : ""}`}
            selected={isActive}
            onClick={() => setActive(!active)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "ScreenshotMode",
    description: "Blurs names, profile pictures and optionally messages with one shortcut, so you can share screenshots safely.",
    tags: ["Privacy", "Utility"],
    searchTerms: ["blur", "screenshot", "privacy", "stream", "hide names"],
    settings,
    managedStyle,
    toolboxActions: {
        "Toggle screenshot mode": () => setActive(!active)
    },

    headerBarButton: {
        icon: EyeIcon,
        render: () => <ToggleButton />
    },

    start() {
        document.addEventListener("keydown", onKeyDown, true);
    },

    stop() {
        document.removeEventListener("keydown", onKeyDown, true);
        active = false;
        applyClasses();
    }
});
