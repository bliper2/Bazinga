/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { ErrorCard } from "@components/ErrorCard";
import { HeadingTertiary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { PluginNative } from "@utils/types";
import { Select, showToast, TextInput, Toasts, useEffect, useMemo, useState } from "@webpack/common";

import { bazingaLogger } from "../_bazinga";
import { settings } from ".";
import { startPreview, stopPreview } from "./preview";
import type { StoreTheme } from "./types";

const Native = VencordNative.pluginHelpers.BetterDiscordThemes as PluginNative<typeof import("./native")>;
const logger = bazingaLogger("BetterDiscordThemes");
const cl = classNameFactory("bz-bdt-");

type Sort = "downloads" | "likes" | "released" | "name";

const sorters: Record<Sort, (a: StoreTheme, b: StoreTheme) => number> = {
    downloads: (a, b) => b.downloads - a.downloads,
    likes: (a, b) => b.likes - a.likes,
    released: (a, b) => b.released.localeCompare(a.released),
    name: (a, b) => a.name.localeCompare(b.name)
};

const formatCount = (n: number) => Intl.NumberFormat(undefined, { notation: "compact" }).format(n);
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

function ThemeBrowser() {
    const [themes, setThemes] = useState<StoreTheme[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [installed, setInstalled] = useState<Map<string, string | undefined>>(new Map());
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState("all");
    const [sort, setSort] = useState<Sort>((settings.store.defaultSort as Sort) ?? "downloads");
    const [busy, setBusy] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState<string | null>(null);
    const [enabledThemes, setEnabledThemes] = useState(Settings.enabledThemes);

    async function refreshInstalled() {
        const list = await VencordNative.themes.getThemesList();
        setInstalled(new Map(list.map(t => [t.fileName, t.version])));
    }

    useEffect(() => {
        Native.getStoreThemes()
            .then(setThemes)
            .catch(err => {
                logger.error("Failed to load store", err);
                setLoadError(errorMessage(err));
            });
        refreshInstalled().catch(err => logger.error("Failed to list installed themes", err));

        // Leaving the page ends any preview so it never sticks around by accident.
        return stopPreview;
    }, []);

    const tags = useMemo(() => [...new Set(themes?.flatMap(t => t.tags))].sort(), [themes]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (themes ?? [])
            .filter(t => tag === "all" || t.tags.includes(tag))
            .filter(t => !q || [t.name, t.author, t.description].some(s => s.toLowerCase().includes(q)))
            .sort(sorters[sort]);
    }, [themes, query, tag, sort]);

    function setEnabled(fileName: string, enabled: boolean) {
        const next = enabled
            ? [...new Set([...Settings.enabledThemes, fileName])]
            : Settings.enabledThemes.filter(f => f !== fileName);
        Settings.enabledThemes = next;
        setEnabledThemes(next);
    }

    async function run(theme: StoreTheme, action: () => Promise<void>, success: string) {
        setBusy(theme.fileName);
        try {
            await action();
            await refreshInstalled();
            showToast(success, Toasts.Type.SUCCESS);
        } catch (err) {
            logger.error(`Action failed for ${theme.name}`, err);
            showToast(`${theme.name}: ${errorMessage(err)}`, Toasts.Type.FAILURE);
        } finally {
            setBusy(null);
        }
    }

    const install = (theme: StoreTheme) =>
        run(theme, async () => {
            await Native.installTheme(theme.fileName, theme.source);
            if (previewing === theme.fileName) {
                stopPreview();
                setPreviewing(null);
            }
            setEnabled(theme.fileName, true);
        }, `Installed ${theme.name}`);

    const update = (theme: StoreTheme) =>
        run(theme, async () => {
            await Native.installTheme(theme.fileName, theme.source);
            // Re-toggle so Equicord reloads a file it already had enabled.
            if (Settings.enabledThemes.includes(theme.fileName)) {
                setEnabled(theme.fileName, false);
                setEnabled(theme.fileName, true);
            }
        }, `Updated ${theme.name}`);

    const uninstall = (theme: StoreTheme) =>
        run(theme, async () => {
            setEnabled(theme.fileName, false);
            await Native.uninstallTheme(theme.fileName);
        }, `Removed ${theme.name}`);

    async function togglePreview(theme: StoreTheme) {
        if (previewing === theme.fileName) {
            stopPreview();
            setPreviewing(null);
            return;
        }
        setBusy(theme.fileName);
        try {
            startPreview(await Native.getThemeSource(theme.source));
            setPreviewing(theme.fileName);
        } catch (err) {
            logger.error(`Preview failed for ${theme.name}`, err);
            showToast(`${theme.name}: ${errorMessage(err)}`, Toasts.Type.FAILURE);
        } finally {
            setBusy(null);
        }
    }

    if (loadError) {
        return (
            <ErrorCard>
                <HeadingTertiary>Could not load the BetterDiscord theme store</HeadingTertiary>
                <Paragraph className={Margins.top8}>{loadError}</Paragraph>
            </ErrorCard>
        );
    }

    if (!themes) return <Paragraph>Loading themes from betterdiscord.app…</Paragraph>;

    return (
        <>
            <Paragraph className={Margins.bottom16}>
                {themes.length} themes from the BetterDiscord store. Installed themes are saved to your themes folder
                and also show up under Themes. A few themes rely on BetterDiscord-only features and may not look
                exactly right, so use Preview to try one before installing it.
            </Paragraph>

            <div className={cl("filters")}>
                <TextInput value={query} onChange={setQuery} placeholder="Search themes, authors, descriptions" />
                <Select
                    options={[{ label: "All tags", value: "all" }, ...tags.map(t => ({ label: t, value: t }))]}
                    select={setTag}
                    isSelected={v => v === tag}
                    serialize={String}
                    closeOnSelect
                />
                <Select
                    options={[
                        { label: "Most downloaded", value: "downloads" },
                        { label: "Most liked", value: "likes" },
                        { label: "Recently updated", value: "released" },
                        { label: "Name", value: "name" }
                    ]}
                    select={v => setSort(v as Sort)}
                    isSelected={v => v === sort}
                    serialize={String}
                    closeOnSelect
                />
            </div>

            <Paragraph className={Margins.bottom8}>{visible.length} shown</Paragraph>

            <div className={cl("grid")}>
                {visible.map(theme => {
                    const installedVersion = installed.get(theme.fileName);
                    const isInstalled = installed.has(theme.fileName);
                    const hasUpdate = isInstalled && !!theme.version && !!installedVersion && installedVersion !== theme.version;
                    const isEnabled = enabledThemes.includes(theme.fileName);
                    const isBusy = busy === theme.fileName;

                    return (
                        <div key={theme.id} className={cl("card")}>
                            {theme.thumbnail
                                ? <img className={cl("thumb")} src={theme.thumbnail} alt="" loading="lazy" />
                                : <div className={cl("thumb")} />}
                            <div className={cl("body")}>
                                <div className={cl("title")}>{theme.name}</div>
                                <div className={cl("meta")}>
                                    by {theme.author} · v{theme.version} · {formatCount(theme.downloads)} downloads ·{" "}
                                    {formatCount(theme.likes)} likes
                                </div>
                                <div className={cl("desc")}>{theme.description}</div>
                                <div className={cl("tags")}>
                                    {theme.tags.map(t => <span key={t} className={cl("tag")}>{t}</span>)}
                                </div>
                                <div className={cl("actions")}>
                                    {isInstalled ? (
                                        <>
                                            <Button
                                                size="small"
                                                variant={isEnabled ? "secondary" : "positive"}
                                                disabled={isBusy}
                                                onClick={() => setEnabled(theme.fileName, !isEnabled)}
                                            >
                                                {isEnabled ? "Disable" : "Enable"}
                                            </Button>
                                            {hasUpdate && (
                                                <Button size="small" variant="positive" disabled={isBusy} onClick={() => update(theme)}>
                                                    Update to v{theme.version}
                                                </Button>
                                            )}
                                            <Button size="small" variant="dangerSecondary" disabled={isBusy} onClick={() => uninstall(theme)}>
                                                Remove
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button size="small" disabled={isBusy} onClick={() => install(theme)}>
                                                Install
                                            </Button>
                                            <Button size="small" variant="secondary" disabled={isBusy} onClick={() => togglePreview(theme)}>
                                                {previewing === theme.fileName ? "Stop preview" : "Preview"}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export default wrapTab(
    () => (
        <SettingsTab>
            <ThemeBrowser />
        </SettingsTab>
    ),
    "BetterDiscord Themes"
);
