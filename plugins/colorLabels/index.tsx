/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import type { Channel, Guild } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";
import { buildLabelCss, LABEL_COLORS, type Labels } from "./css";

const logger = bazingaLogger("ColorLabels");
const STORE_KEY = "Bazinga_ColorLabels";

let labels: Labels = { guilds: {}, channels: {} };
let style: HTMLStyleElement | undefined;

function render() {
    if (style) style.textContent = buildLabelCss(labels);
}

async function setLabel(kind: keyof Labels, id: string, color: string | null) {
    const next = { ...labels, [kind]: { ...labels[kind] } };
    if (color) next[kind][id] = color;
    else delete next[kind][id];

    labels = next;
    render();
    await DataStore.set(STORE_KEY, labels);
}

function labelMenu(kind: keyof Labels, id: string, idPrefix: string) {
    return (
        <Menu.MenuItem id={`${idPrefix}-label`} label="Color label">
            {Object.entries(LABEL_COLORS).map(([name, color]) => (
                <Menu.MenuItem
                    key={name}
                    id={`${idPrefix}-label-${name}`}
                    label={name}
                    color={undefined}
                    action={() => setLabel(kind, id, color).catch(err => logger.error("Failed to save label", err))}
                />
            ))}
            {labels[kind][id] && (
                <Menu.MenuItem
                    id={`${idPrefix}-label-clear`}
                    label="Remove label"
                    color="danger"
                    action={() => setLabel(kind, id, null).catch(err => logger.error("Failed to save label", err))}
                />
            )}
        </Menu.MenuItem>
    );
}

const guildPatch: NavContextMenuPatchCallback = (children, props: { guild?: Guild; }) => {
    if (props.guild) children.push(labelMenu("guilds", props.guild.id, "bz-guild"));
};

const channelPatch: NavContextMenuPatchCallback = (children, props: { channel?: Channel; }) => {
    if (props.channel) children.push(labelMenu("channels", props.channel.id, "bz-channel"));
};

export default definePlugin({
    name: "ColorLabels",
    description: "Right-click a server or channel and give it a color: a dot on the server icon, or colored text for a channel. Only you see it.",
    tags: ["Organisation", "Appearance"],
    searchTerms: ["color", "label", "tag", "server", "channel", "organize"],

    contextMenus: {
        "guild-context": guildPatch,
        "channel-context": channelPatch,
        "thread-context": channelPatch
    },

    async start() {
        style = document.createElement("style");
        style.id = "bazinga-color-labels";
        document.head.append(style);

        try {
            labels = (await DataStore.get<Labels>(STORE_KEY)) ?? labels;
        } catch (err) {
            logger.error("Failed to load labels", err);
        }
        render();
    },

    stop() {
        style?.remove();
        style = undefined;
    }
});
