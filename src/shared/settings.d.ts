/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Rectangle } from "electron";

export interface Settings {
    discordBranch: "stable" | "canary" | "ptb";
    transparencyOption: "none" | "mica" | "tabbed" | "acrylic";
    webRTCIPHandlingPolicy:
        | "default"
        | "default_public_interface_only"
        | "default_public_and_private_interfaces"
        | "disable_non_proxied_udp";
    tray: boolean;
    minimizeToTray: boolean;
    autoStartMinimized: boolean;
    middleClickAutoscroll: boolean;
    openLinksWithElectron: boolean;
    staticTitle: boolean;
    enableMenu: boolean;
    enableShadow: boolean;
    enableRoundedCorners: boolean;
    disableSmoothScroll: boolean;
    hardwareAcceleration: boolean;
    hardwareVideoAcceleration: boolean;
    arRPC: boolean;
    arRPCDisabled: boolean;
    arRPCDebug: boolean;
    arRPCProcessScanning: boolean;
    arRPCWebSocketAutoReconnect: boolean;
    arRPCWebSocketCustomHost?: string;
    arRPCWebSocketCustomPort?: number;
    appBadge: boolean;
    badgeOnlyForMentions: boolean;
    enableTaskbarFlashing: boolean;
    disableMinSize: boolean;
    clickTrayToShowHide: boolean;
    nativeTitleBar: boolean;

    /** Chromium flag bundles applied at startup. Needs a restart. */
    performancePreset: "balanced" | "performance" | "battery";
    /** Memory-saving flag plus a stylesheet that removes animations and blur. */
    lowEndMode: boolean;
    /** Blocks Discord's analytics and crash-report requests at the network level. */
    blockTelemetry: boolean;

    /** Electron accelerator, like "Ctrl+Alt+B". Empty means no shortcut. */
    globalShowHideShortcut: string;
    globalMuteShortcut: string;

    enableSplashScreen: boolean;
    splashTheming: boolean;
    splashPixelated: boolean;
    splashColor?: string;
    splashBackground?: string;
    splashProgress: boolean;

    spellCheckLanguages?: string[];

    audio?: {
        workaround?: boolean;

        deviceSelect?: boolean;
        granularSelect?: boolean;

        ignoreVirtual?: boolean;
        ignoreDevices?: boolean;
        ignoreInputMedia?: boolean;

        mute?: boolean;
        onlySpeakers?: boolean;
        onlyDefaultSpeakers?: boolean;
    };
}

export interface State {
    maximized?: boolean;
    minimized?: boolean;
    windowBounds?: Rectangle;

    firstLaunch?: boolean;

    steamOSLayoutVersion?: number;
    linuxAutoStartEnabled?: boolean;

    equicordDir?: string;
    /** Size and modification time of the bundled Equicord build that was last copied into place. */
    equicordSeed?: string;

    launchArguments?: string;

    /** Starts that did not run for a minute or close normally. Three in a row start safe mode. */
    startAttempts?: number;
    /** App version that last ran, to show what changed after an update. */
    lastVersion?: string;

    lastElectronVersion?: string;

    updater?: {
        ignoredVersion?: string;
        snoozeUntil?: number;
    };
}
