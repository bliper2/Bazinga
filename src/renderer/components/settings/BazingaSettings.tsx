/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Heading, Paragraph } from "@equicord/types/components";
import { copyToClipboard, Margins } from "@equicord/types/utils";
import { Select, TextInput, Toasts, useEffect, useState } from "@equicord/types/webpack/common";

import { SimpleErrorBoundary } from "../SimpleErrorBoundary";
import { cl, SettingsComponent } from "./Settings";

const native = () => VesktopNative.bazinga;

const toast = (message: string, type = Toasts.Type.MESSAGE) => Toasts.show({ message, type, id: Toasts.genId() });

const errorText = (err: unknown) => (err instanceof Error ? err.message.replace(/^.*Error: /, "") : String(err));

export const PerformancePresetPicker: SettingsComponent = ({ settings }) => (
    <SimpleErrorBoundary>
        <Heading tag="h5">Performance preset</Heading>
        <Paragraph className={Margins.bottom8}>
            Balanced uses Chromium's defaults. Performance draws the page on the graphics card. Battery saver lowers
            memory use and turns off animations. Needs a restart.
        </Paragraph>
        <Select
            options={[
                { label: "Balanced", value: "balanced", default: true },
                { label: "Performance", value: "performance" },
                { label: "Battery saver", value: "battery" }
            ]}
            closeOnSelect
            select={v => (settings.performancePreset = v)}
            isSelected={v => v === settings.performancePreset}
            serialize={s => s}
        />
    </SimpleErrorBoundary>
);

export const ShortcutInputs: SettingsComponent = ({ settings }) => (
    <SimpleErrorBoundary>
        <Heading tag="h5">Global shortcuts</Heading>
        <Paragraph className={Margins.bottom8}>
            These work even when Bazinga is in the background. Write them like Ctrl+Alt+B. Leave empty for none.
        </Paragraph>
        <Paragraph>Show or hide the window</Paragraph>
        <TextInput
            value={settings.globalShowHideShortcut}
            placeholder="Ctrl+Alt+B"
            onChange={(v: string) => (settings.globalShowHideShortcut = v)}
        />
        <Paragraph className={Margins.top8}>Mute or unmute your microphone</Paragraph>
        <TextInput
            value={settings.globalMuteShortcut}
            placeholder="Ctrl+Alt+M"
            onChange={(v: string) => (settings.globalMuteShortcut = v)}
        />
    </SimpleErrorBoundary>
);

export const StartupAndTelemetryInfo: SettingsComponent = () => {
    const [timings, setTimings] = useState<{ step: string; ms: number }[]>([]);
    const [blocked, setBlocked] = useState<number | null>(null);

    useEffect(() => {
        native()
            .getStartupTimings()
            .then(setTimings)
            .catch(() => {});
        native()
            .getBlockedRequests()
            .then(r => setBlocked(r.total))
            .catch(() => {});
    }, []);

    return (
        <SimpleErrorBoundary>
            <Heading tag="h5">Last startup</Heading>
            <Paragraph>
                {timings.length
                    ? timings.map(t => `${t.step}: ${(t.ms / 1000).toFixed(2)} s`).join(" · ")
                    : "No data yet."}
            </Paragraph>
            <Paragraph className={Margins.top8}>
                {blocked === null ? "" : `Tracking and crash-report requests blocked this session: ${blocked}`}
            </Paragraph>
        </SimpleErrorBoundary>
    );
};

export const ProfilesPanel: SettingsComponent = () => {
    const [info, setInfo] = useState<{ current: string | null; profiles: string[] } | null>(null);
    const [name, setName] = useState("");

    useEffect(() => {
        native()
            .listProfiles()
            .then(setInfo)
            .catch(() => {});
    }, []);

    const open = (profile: string | null) =>
        native()
            .openProfile(profile)
            .then(() => toast(profile ? `Opening profile "${profile}"` : "Opening the default profile"))
            .catch(err => toast(errorText(err), Toasts.Type.FAILURE));

    return (
        <SimpleErrorBoundary>
            <Heading tag="h5">Profiles</Heading>
            <Paragraph className={Margins.bottom8}>
                Each profile has its own login and settings and opens in its own window, so you can use several accounts
                at once.
                {info?.current ? ` You are in the profile "${info.current}".` : " You are in the default profile."}
            </Paragraph>
            <div className={cl("button-grid")}>
                {info?.current && <Button onClick={() => open(null)}>Open default</Button>}
                {info?.profiles
                    .filter(p => p !== info.current)
                    .map(p => (
                        <Button key={p} onClick={() => open(p)}>
                            Open {p}
                        </Button>
                    ))}
            </div>
            <Paragraph className={Margins.top8}>New profile</Paragraph>
            <TextInput value={name} placeholder="Profile name" onChange={setName} />
            <Button
                className={Margins.top8}
                disabled={!name.trim()}
                onClick={() => open(name.trim()).then(() => setName(""))}
            >
                Create and open
            </Button>
        </SimpleErrorBoundary>
    );
};

export const BackupPanel: SettingsComponent = () => {
    const [password, setPassword] = useState("");

    const exportSettings = () =>
        native()
            .exportSettings(password || undefined)
            .then(r => r === "ok" && toast("Settings exported", Toasts.Type.SUCCESS))
            .catch(err => toast(errorText(err), Toasts.Type.FAILURE));

    const importSettings = () =>
        native()
            .importSettings(password || undefined)
            .then(r => {
                if (r === "password-needed")
                    toast("This file is encrypted. Enter its password first.", Toasts.Type.FAILURE);
                else if (r === "wrong-password") toast("Wrong password, or the file was changed.", Toasts.Type.FAILURE);
                else if (r === "invalid") toast("That is not a Bazinga settings file.", Toasts.Type.FAILURE);
            })
            .catch(err => toast(errorText(err), Toasts.Type.FAILURE));

    return (
        <SimpleErrorBoundary>
            <Heading tag="h5">Backup</Heading>
            <Paragraph className={Margins.bottom8}>
                Save your settings, Equicord plugins and settings, QuickCSS and themes to one file, or load them back.
                Your login is not included. Add a password to encrypt the file.
            </Paragraph>
            <TextInput value={password} placeholder="Password (optional)" type="password" onChange={setPassword} />
            <div className={cl("button-grid") + " " + Margins.top8}>
                <Button onClick={exportSettings}>Export settings</Button>
                <Button onClick={importSettings}>Import settings</Button>
            </div>
        </SimpleErrorBoundary>
    );
};

export const MaintenanceButtons: SettingsComponent = () => (
    <SimpleErrorBoundary>
        <Heading tag="h5">Troubleshooting</Heading>
        <div className={cl("button-grid")}>
            <Button onClick={() => native().reload()}>Reload client</Button>
            <Button
                onClick={async () => {
                    try {
                        const plugins = Object.keys(Vencord.Plugins.plugins)
                            .filter(name => Vencord.Plugins.isPluginEnabled(name))
                            .sort();
                        await copyToClipboard(
                            `${await native().getDebugInfo()}\nEnabled plugins (${plugins.length}): ${plugins.join(", ")}`
                        );
                        toast("Debug info copied. Paste it into your bug report.", Toasts.Type.SUCCESS);
                    } catch (err) {
                        toast(errorText(err), Toasts.Type.FAILURE);
                    }
                }}
            >
                Copy debug info
            </Button>
            <Button
                onClick={() => {
                    if (confirm("Replace Equicord with the version that came with this app? The app restarts.")) {
                        native()
                            .restoreBundledEquicord()
                            .catch(err => toast(errorText(err), Toasts.Type.FAILURE));
                    }
                }}
            >
                Restore bundled Equicord
            </Button>
        </div>
        <Paragraph className={Margins.top8}>
            Debug info has no file paths, accounts or tokens. Start Bazinga with <code>--safe-mode</code> to run with
            every plugin and theme off.
        </Paragraph>
    </SimpleErrorBoundary>
);
