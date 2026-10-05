/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import type { PluginNative } from "@utils/types";
import { showToast, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { bazingaLogger } from "../_bazinga";
import { renderTheme } from "../_bazinga/themeTemplate";
import { COLOR_FIELDS, deriveAccent, PRESETS, type StudioColors, themeFileName } from "./studio";

const Native = VencordNative.pluginHelpers.ThemeStudio as PluginNative<typeof import("./native")>;
const logger = bazingaLogger("ThemeStudio");
const cl = classNameFactory("bz-studio-");
const PREVIEW_ID = "bazinga-studio-preview";

function buildCss(name: string, author: string, colors: StudioColors) {
    return renderTheme(
        { name: name.trim() || "My theme", author: author.trim() || "me", description: "Made with Bazinga Theme Studio.", version: "1.0.0" },
        { ...colors, ...deriveAccent(colors.accent) }
    );
}

function setPreview(css: string | null) {
    document.getElementById(PREVIEW_ID)?.remove();
    if (css === null) return;
    const style = Object.assign(document.createElement("style"), { id: PREVIEW_ID, textContent: css });
    document.head.append(style);
}

function Studio() {
    const [colors, setColors] = useState<StudioColors>({ ...PRESETS.Dark });
    const [name, setName] = useState("My theme");
    const [author, setAuthor] = useState("");
    const [previewing, setPreviewing] = useState(false);

    // Leaving the page ends the preview, so a half-finished theme never stays on by accident.
    useEffect(() => () => setPreview(null), []);

    // While previewing, every change shows up right away.
    useEffect(() => {
        if (previewing) setPreview(buildCss(name, author, colors));
    }, [previewing, colors, name, author]);

    const save = async () => {
        try {
            const fileName = themeFileName(name);
            await Native.saveStudioTheme(fileName, buildCss(name, author, colors));
            setPreview(null);
            setPreviewing(false);
            Settings.enabledThemes = [...new Set([...Settings.enabledThemes, fileName])];
            showToast(`Saved and turned on ${fileName}`, Toasts.Type.SUCCESS);
        } catch (err) {
            logger.error("Failed to save theme", err);
            showToast("Could not save the theme", Toasts.Type.FAILURE);
        }
    };

    return (
        <>
            <Paragraph className={Margins.bottom16}>
                Pick the colors, try them live with Preview, then save the theme. It is saved to your themes folder and turned on, and you can
                edit or remove it later under Themes. The accent hover and mention colors are worked out from the accent.
            </Paragraph>

            <div className={cl("row")}>
                <TextInput value={name} onChange={setName} placeholder="Theme name" />
                <TextInput value={author} onChange={setAuthor} placeholder="Your name (shown as author)" />
            </div>

            <div className={cl("presets")}>
                <span>Start from</span>
                {Object.entries(PRESETS).map(([label, preset]) => (
                    <Button key={label} size="small" variant="secondary" onClick={() => setColors({ ...preset })}>
                        {label}
                    </Button>
                ))}
            </div>

            <div className={cl("grid")}>
                {COLOR_FIELDS.map(({ key, label }) => (
                    <label key={key} className={cl("field")}>
                        <input type="color" value={colors[key]} onChange={e => setColors({ ...colors, [key]: e.currentTarget.value })} />
                        <span>{label}</span>
                        <code>{colors[key]}</code>
                    </label>
                ))}
            </div>

            <div className={cl("actions")}>
                <Button variant={previewing ? "secondary" : "primary"} onClick={() => setPreviewing(p => (p ? (setPreview(null), false) : true))}>
                    {previewing ? "Stop preview" : "Preview"}
                </Button>
                <Button variant="positive" onClick={save}>
                    Save and turn on
                </Button>
            </div>
        </>
    );
}

export default wrapTab(
    () => (
        <SettingsTab>
            <Studio />
        </SettingsTab>
    ),
    "Theme Studio"
);
