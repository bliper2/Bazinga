/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";
import { TextArea, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, guard } from "../_bazinga";
import { daysUntil, describeDays, parseBirthdays } from "./birthdays";

const logger = bazingaLogger("BirthdayReminders");
const NOTIFIED_KEY = "Bazinga_BirthdaysNotified";
const CHECK_MS = 60 * 60 * 1000;

function Editor() {
    const [text, setText] = useState(settings.store.list);
    const { birthdays, bad } = parseBirthdays(text);
    const now = new Date();
    const upcoming = [...birthdays].sort((a, b) => daysUntil(a, now) - daysUntil(b, now)).slice(0, 5);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Paragraph>One person per line, then the date as month-day. For example: Sam 03-14</Paragraph>
            <TextArea
                value={text}
                rows={6}
                placeholder={"Sam 03-14\nAlex 11-02"}
                onChange={(value: string) => {
                    setText(value);
                    settings.store.list = value;
                }}
            />
            {bad.length > 0 && <Paragraph style={{ color: "var(--status-danger, #da373c)" }}>Could not read: {bad.join("; ")}</Paragraph>}
            {upcoming.length > 0 && (
                <Paragraph>
                    Next: {upcoming.map(b => `${b.name} ${describeDays(daysUntil(b, now))}`).join(", ")}
                </Paragraph>
            )}
        </div>
    );
}

const settings = definePluginSettings({
    // The editor shows the list and stores the text in this setting.
    list: {
        type: OptionType.COMPONENT,
        component: Editor,
        default: "" as string
    },
    daysBefore: {
        type: OptionType.SLIDER,
        description: "Also remind me this many days before (0 for only on the day)",
        markers: [0, 1, 3, 7],
        default: 1,
        stickToMarkers: false
    }
});

let timer: ReturnType<typeof setInterval> | undefined;

const check = guard(logger, "Failed to check birthdays", async () => {
    const { birthdays } = parseBirthdays(settings.store.list ?? "");
    if (!birthdays.length) return;

    const now = new Date();
    const notified: Record<string, string> = (await DataStore.get(NOTIFIED_KEY)) ?? {};
    const todayKey = now.toISOString().slice(0, 10);
    let changed = false;

    for (const person of birthdays) {
        const days = daysUntil(person, now);
        if (days > settings.store.daysBefore) continue;

        // One reminder per person per stage and day: the day before and the day itself both count.
        const key = `${person.name}|${person.month}-${person.day}|${days}`;
        if (notified[key] === todayKey) continue;
        notified[key] = todayKey;
        changed = true;

        showNotification({
            title: days === 0 ? `${person.name}'s birthday is today` : `${person.name}'s birthday is ${describeDays(days)}`,
            body: "Don't forget to say happy birthday.",
            permanent: true
        });
    }

    if (changed) {
        // Keep the record small: forget anything older than a week.
        const cutoff = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
        for (const key of Object.keys(notified)) if (notified[key] < cutoff) delete notified[key];
        await DataStore.set(NOTIFIED_KEY, notified);
    }
});

export default definePlugin({
    name: "BirthdayReminders",
    description: "Keep a list of birthdays you enter yourself and get a reminder before and on the day. It only reminds you; it never sends anything.",
    tags: ["Organisation", "Friends"],
    searchTerms: ["birthday", "reminder", "friends", "calendar", "date"],
    settings,

    start() {
        check();
        timer = setInterval(check, CHECK_MS);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
    }
});
