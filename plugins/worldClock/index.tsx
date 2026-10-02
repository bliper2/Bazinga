/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { ClockIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, useEffect, useState } from "@webpack/common";

import { definePlugin } from "../_bazinga";

function isTimeZone(zone: string) {
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: zone });
        return true;
    } catch {
        return false;
    }
}

const settings = definePluginSettings({
    zones: {
        type: OptionType.STRING,
        description: "Time zones to show, separated by commas (for example Europe/London, America/New_York, Asia/Tokyo)",
        default: "UTC, America/New_York, Europe/London, Asia/Tokyo",
        isValid: (value: string) => {
            const bad = value.split(",").map(z => z.trim()).filter(z => z && !isTimeZone(z));
            return bad.length ? `Unknown time zone: ${bad.join(", ")}` : true;
        }
    },
    hour12: {
        type: OptionType.BOOLEAN,
        description: "Use 12-hour time",
        default: false
    }
});

function zones() {
    return settings.store.zones.split(",").map(z => z.trim()).filter(isTimeZone);
}

function format(zone: string, now: Date, withDay: boolean) {
    return new Intl.DateTimeFormat(undefined, {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: settings.store.hour12,
        ...(withDay ? { weekday: "short" } : {})
    }).format(now);
}

const label = (zone: string) => zone.split("/").pop()!.replace(/_/g, " ");

function useNow(intervalMs: number) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
}

function ClockModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const now = useNow(1000);
    return (
        <Modal {...modalProps} size="sm" title="World clock">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12 }}>
                {zones().map(zone => (
                    <div key={zone} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-default, var(--text-normal))", fontSize: 16 }}>
                        <span>{label(zone)}</span>
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>{format(zone, now, true)}</strong>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

const ClockButton = ErrorBoundary.wrap(() => {
    const now = useNow(30_000);
    settings.use(["zones", "hour12"]);
    const tooltip = zones().slice(0, 4).map(z => `${label(z)} ${format(z, now, false)}`).join(" · ");
    return (
        <HeaderBarButton
            icon={ClockIcon}
            tooltip={tooltip || "World clock"}
            onClick={() => openModal(props => <ClockModal modalProps={props} />)}
        />
    );
}, { noop: true });

export default definePlugin({
    name: "WorldClock",
    description: "A title-bar clock showing the time in the time zones you choose.",
    tags: ["Utility", "Friends"],
    searchTerms: ["time", "timezone", "clock", "world"],
    settings,

    headerBarButton: {
        icon: ClockIcon,
        render: () => <ClockButton />
    }
});
