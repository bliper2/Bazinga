/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings, Settings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";
import type { Guild } from "@vencord/discord-types";
import { Menu, Select, SelectedGuildStore, TextInput, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { applyDesired, DEFAULT_CONFIG, desiredTheme, managedThemes, type ScheduleConfig } from "./schedule";

const logger = bazingaLogger("ThemeScheduler");
const CHECK_MS = 60_000;

let installed: { fileName: string; name: string; }[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let media: MediaQueryList | undefined;
let currentGuild: string | null = null;

const config = (): ScheduleConfig => ({ ...DEFAULT_CONFIG, ...settings.store.config });

async function loadInstalled() {
    try {
        installed = (await VencordNative.themes.getThemesList()).map(t => ({ fileName: t.fileName, name: t.name }));
    } catch (err) {
        logger.warn("Could not list the themes", err);
    }
}

function evaluate() {
    try {
        const current = config();
        const desired = desiredTheme(current, { now: new Date(), systemDark: !!media?.matches, guildId: currentGuild });
        const next = applyDesired(Settings.enabledThemes, managedThemes(current), desired);

        // Only write when something changes, so the page is not restyled every minute for nothing.
        const same = next.length === Settings.enabledThemes.length && next.every(t => Settings.enabledThemes.includes(t));
        if (!same) Settings.enabledThemes = next;
    } catch (err) {
        logger.error("Failed to switch theme", err);
    }
}

function ThemeSelect({ value, onChange }: { value: string; onChange(value: string): void; }) {
    return (
        <Select
            options={[{ label: "No theme", value: "" }, ...installed.map(t => ({ label: t.name, value: t.fileName }))]}
            select={onChange}
            isSelected={v => v === value}
            serialize={String}
            closeOnSelect
        />
    );
}

function Editor() {
    const [current, setCurrent] = useState(config());
    useEffect(() => {
        loadInstalled().then(() => setCurrent(config()));
    }, []);

    const update = (patch: Partial<ScheduleConfig>) => {
        const next = { ...current, ...patch };
        setCurrent(next);
        settings.store.config = next;
        evaluate();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Paragraph>When to switch</Paragraph>
            <Select
                options={[
                    { label: "Never (only per-server themes)", value: "off" },
                    { label: "By the time of day", value: "time" },
                    { label: "Follow my system's light or dark setting", value: "system" }
                ]}
                select={(v: ScheduleConfig["mode"]) => update({ mode: v })}
                isSelected={v => v === current.mode}
                serialize={String}
                closeOnSelect
            />
            <Paragraph>Daytime or light theme</Paragraph>
            <ThemeSelect value={current.dayTheme} onChange={dayTheme => update({ dayTheme })} />
            <Paragraph>Night or dark theme</Paragraph>
            <ThemeSelect value={current.nightTheme} onChange={nightTheme => update({ nightTheme })} />
            {current.mode === "time" && (
                <>
                    <Paragraph>Day starts at (24-hour time)</Paragraph>
                    <TextInput value={current.dayStart} onChange={(dayStart: string) => update({ dayStart })} placeholder="07:00" />
                    <Paragraph>Night starts at (24-hour time)</Paragraph>
                    <TextInput value={current.nightStart} onChange={(nightStart: string) => update({ nightStart })} placeholder="19:00" />
                </>
            )}
            <Paragraph>
                Themes the schedule controls are turned on and off by it. To give one server its own theme, right-click the server and choose
                Theme for this server.
            </Paragraph>
        </div>
    );
}

const settings = definePluginSettings({
    config: {
        type: OptionType.COMPONENT,
        component: Editor,
        default: DEFAULT_CONFIG as ScheduleConfig
    }
});

const guildMenuPatch: NavContextMenuPatchCallback = (children, props: { guild?: Guild; }) => {
    const { guild } = props;
    if (!guild) return;

    const setTheme = (fileName: string) => {
        const guildThemes = { ...config().guildThemes };
        if (fileName) guildThemes[guild.id] = fileName;
        else delete guildThemes[guild.id];
        settings.store.config = { ...config(), guildThemes };
        evaluate();
    };
    const chosen = config().guildThemes[guild.id] ?? "";

    children.push(
        <Menu.MenuItem id="bz-guild-theme" label="Theme for this server">
            <Menu.MenuRadioItem group="bz-guild-theme" id="bz-guild-theme-none" label="Same as everywhere else" checked={!chosen} action={() => setTheme("")} />
            {installed.map(t => (
                <Menu.MenuRadioItem key={t.fileName} group="bz-guild-theme" id={`bz-guild-theme-${t.fileName}`} label={t.name} checked={chosen === t.fileName} action={() => setTheme(t.fileName)} />
            ))}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "ThemeScheduler",
    description: "Switch themes by the time of day, by your system's light or dark setting, or give each server its own theme.",
    tags: ["Appearance", "Customisation"],
    searchTerms: ["theme", "schedule", "dark mode", "light mode", "automatic", "night", "per server"],
    settings,

    contextMenus: {
        "guild-context": guildMenuPatch
    },

    flux: {
        CHANNEL_SELECT({ guildId }: { guildId?: string | null; }) {
            currentGuild = guildId ?? null;
            evaluate();
        }
    },

    async start() {
        media = matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", evaluate);
        currentGuild = SelectedGuildStore.getGuildId() ?? null;

        await loadInstalled();
        evaluate();
        timer = setInterval(() => {
            loadInstalled();
            evaluate();
        }, CHECK_MS);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
        media?.removeEventListener("change", evaluate);
        media = undefined;
    }
});
