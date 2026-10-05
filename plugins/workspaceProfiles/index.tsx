/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { openModal } from "@utils/modal";
import type { Guild, RenderModalProps } from "@vencord/discord-types";
import { ContextMenuApi, GuildStore, Menu, Modal, TextInput, useState } from "@webpack/common";

import { bazingaLogger, definePlugin, setHiddenGuilds } from "../_bazinga";
import { GridIcon } from "../_bazinga/icons";
import { hiddenFor, normalizeName, toggleMember, type Workspaces } from "./workspaces";

const logger = bazingaLogger("WorkspaceProfiles");
const STORE_KEY = "Bazinga_Workspaces";

let data: Workspaces = { list: [], active: null };

async function save(next: Workspaces) {
    data = next;
    apply();
    await DataStore.set(STORE_KEY, data);
}

function apply() {
    const members = data.list.find(w => w.name === data.active)?.guildIds;
    setHiddenGuilds("workspace", members ? hiddenFor(Object.keys(GuildStore.getGuilds()), members) : null);
}

function NewWorkspaceModal({ guildId, modalProps }: { guildId?: string; modalProps: RenderModalProps; }) {
    const [name, setName] = useState("");
    const clean = normalizeName(name);
    const taken = data.list.some(w => w.name === clean);

    const create = () => {
        if (!clean || taken) return;
        save({ ...data, list: [...data.list, { name: clean, guildIds: guildId ? [guildId] : [] }] }).catch(err => logger.error("Failed to save", err));
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            size="sm"
            title="New workspace"
            subtitle="A workspace shows only the servers you add to it. Right-click a server to add it."
            actions={[{ text: "Create", variant: "primary", disabled: !clean || taken, onClick: create }]}
        >
            <TextInput value={name} onChange={setName} placeholder="Work, Gaming, Family…" autoFocus />
            {taken && <p style={{ color: "var(--status-danger, #da373c)" }}>A workspace with this name already exists.</p>}
        </Modal>
    );
}

const openNew = (guildId?: string) => openModal(props => <NewWorkspaceModal guildId={guildId} modalProps={props} />);

const guildMenuPatch: NavContextMenuPatchCallback = (children, props: { guild?: Guild; }) => {
    const { guild } = props;
    if (!guild) return;

    children.push(
        <Menu.MenuItem id="bz-workspaces" label="Workspaces">
            {data.list.map(w => (
                <Menu.MenuCheckboxItem
                    key={w.name}
                    id={`bz-ws-${w.name}`}
                    label={w.name}
                    checked={w.guildIds.includes(guild.id)}
                    action={() => save({ ...data, list: data.list.map(x => (x.name === w.name ? toggleMember(x, guild.id) : x)) })}
                />
            ))}
            <Menu.MenuItem id="bz-ws-new" label="New workspace…" action={() => openNew(guild.id)} />
        </Menu.MenuItem>
    );
};

const WorkspaceButton = ErrorBoundary.wrap(() => {
    const open = (e: React.MouseEvent) =>
        ContextMenuApi.openContextMenu(e, () => (
            <Menu.Menu navId="bz-workspace-menu" onClose={ContextMenuApi.closeContextMenu} aria-label="Workspaces">
                <Menu.MenuRadioItem group="ws" id="bz-ws-all" label="All servers" checked={!data.active} action={() => save({ ...data, active: null })} />
                {data.list.map(w => (
                    <Menu.MenuRadioItem
                        key={w.name}
                        group="ws"
                        id={`bz-ws-pick-${w.name}`}
                        label={`${w.name} (${w.guildIds.length})`}
                        checked={data.active === w.name}
                        action={() => save({ ...data, active: w.name })}
                    />
                ))}
                <Menu.MenuSeparator />
                <Menu.MenuItem id="bz-ws-create" label="New workspace…" action={() => openNew()} />
                {data.list.length > 0 && (
                    <Menu.MenuItem id="bz-ws-delete" label="Delete workspace" color="danger">
                        {data.list.map(w => (
                            <Menu.MenuItem
                                key={w.name}
                                id={`bz-ws-del-${w.name}`}
                                label={w.name}
                                color="danger"
                                action={() => save({ list: data.list.filter(x => x.name !== w.name), active: data.active === w.name ? null : data.active })}
                            />
                        ))}
                    </Menu.MenuItem>
                )}
            </Menu.Menu>
        ));

    return <HeaderBarButton icon={GridIcon} selected={!!data.active} tooltip={data.active ? `Workspace: ${data.active}` : "Workspaces"} onClick={open} />;
}, { noop: true });

export default definePlugin({
    name: "WorkspaceProfiles",
    description: "Group your servers into workspaces like Work or Gaming and switch between them to see only the servers you need.",
    tags: ["Organisation", "Servers"],
    searchTerms: ["workspace", "profile", "group servers", "hide servers", "folders"],

    contextMenus: {
        "guild-context": guildMenuPatch
    },

    headerBarButton: {
        icon: GridIcon,
        render: () => <WorkspaceButton />
    },

    flux: {
        // New servers have to be hidden too while a workspace is active.
        GUILD_CREATE: apply,
        GUILD_DELETE: apply
    },

    async start() {
        try {
            data = (await DataStore.get<Workspaces>(STORE_KEY)) ?? data;
        } catch (err) {
            logger.error("Failed to load workspaces", err);
        }
        apply();
    },

    stop() {
        setHiddenGuilds("workspace", null);
    }
});
