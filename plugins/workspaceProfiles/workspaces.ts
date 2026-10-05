/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Workspace {
    name: string;
    guildIds: string[];
}

export interface Workspaces {
    list: Workspace[];
    /** Name of the workspace in use, or null to show every server. */
    active: string | null;
}

export const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 30);

/** The servers to hide: every server that is not in the workspace. */
export function hiddenFor(allGuildIds: string[], members: string[]) {
    const keep = new Set(members);
    return allGuildIds.filter(id => !keep.has(id));
}

/** Adds the server to the workspace, or removes it if it is already there. */
export function toggleMember(workspace: Workspace, guildId: string): Workspace {
    return {
        ...workspace,
        guildIds: workspace.guildIds.includes(guildId)
            ? workspace.guildIds.filter(id => id !== guildId)
            : [...workspace.guildIds, guildId]
    };
}
