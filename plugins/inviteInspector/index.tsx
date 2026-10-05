/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { openModal } from "@utils/modal";
import type { RenderModalProps } from "@vencord/discord-types";
import { Menu, Modal, RestAPI, showToast, SnowflakeUtils, Toasts, useEffect, useState } from "@webpack/common";

import { bazingaLogger, definePlugin } from "../_bazinga";

const logger = bazingaLogger("InviteInspector");

const INVITE = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([\w-]{2,32})/i;
const DAY_MS = 24 * 60 * 60 * 1000;

const VERIFICATION = ["None", "Low: verified email", "Medium: registered 5+ minutes", "High: member 10+ minutes", "Very high: verified phone"];
const NOTABLE_FEATURES: Record<string, string> = {
    VERIFIED: "Verified",
    PARTNERED: "Partnered",
    COMMUNITY: "Community server",
    DISCOVERABLE: "In Server Discovery",
    INVITES_DISABLED: "Invites paused"
};

interface InviteInfo {
    code: string;
    expires_at?: string | null;
    approximate_member_count?: number;
    approximate_presence_count?: number;
    inviter?: { id: string; username: string; global_name?: string | null; };
    channel?: { name: string; };
    guild?: {
        id: string;
        name: string;
        verification_level: number;
        features: string[];
        premium_subscription_count?: number;
        nsfw_level?: number;
    };
}

const ageDays = (id: string) => Math.floor((Date.now() - SnowflakeUtils.extractTimestamp(id)) / DAY_MS);

function warningsFor(invite: InviteInfo) {
    const warnings: string[] = [];
    if (invite.guild && ageDays(invite.guild.id) < 7) warnings.push("This server was created less than a week ago.");
    if (invite.inviter && ageDays(invite.inviter.id) < 7) warnings.push("The person who made this invite has a very new account.");
    if (invite.guild?.nsfw_level === 3) warnings.push("This server is age-restricted.");
    return warnings;
}

function InviteModal({ code, modalProps }: { code: string; modalProps: RenderModalProps; }) {
    const [invite, setInvite] = useState<InviteInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // The same request Discord makes to show an invite preview. It does not join the server.
        RestAPI.get({ url: `/invites/${encodeURIComponent(code)}`, query: { with_counts: true, with_expiration: true } })
            .then(({ body }) => setInvite(body))
            .catch(err => {
                logger.warn("Could not load invite", err);
                setError(err?.status === 404 ? "This invite does not exist or has expired." : "Could not load this invite.");
            });
    }, [code]);

    const guild = invite?.guild;
    const features = guild?.features.filter(f => f in NOTABLE_FEATURES).map(f => NOTABLE_FEATURES[f]);
    const rows: [string, string][] = guild
        ? [
            ["Server", guild.name],
            ["Created", `${new Date(SnowflakeUtils.extractTimestamp(guild.id)).toLocaleDateString()} (${ageDays(guild.id)} days ago)`],
            ["Members", `${invite!.approximate_member_count?.toLocaleString() ?? "?"} (${invite!.approximate_presence_count?.toLocaleString() ?? "?"} online)`],
            ["Verification", VERIFICATION[guild.verification_level] ?? "Unknown"],
            ["Boosts", String(guild.premium_subscription_count ?? 0)],
            ["Channel", invite!.channel?.name ? `#${invite!.channel.name}` : "Unknown"],
            ["Invited by", invite!.inviter ? `${invite!.inviter.global_name ?? invite!.inviter.username} (account ${ageDays(invite!.inviter.id)} days old)` : "Unknown"],
            ["Expires", invite!.expires_at ? new Date(invite!.expires_at).toLocaleString() : "Never"]
        ]
        : [];
    if (features?.length) rows.push(["Features", features.join(", ")]);
    const warnings = invite ? warningsFor(invite) : [];

    return (
        <Modal {...modalProps} size="md" title="Invite details" subtitle="Looking at an invite does not join the server.">
            {error && <p style={{ color: "var(--text-muted)" }}>{error}</p>}
            {!error && !invite && <p style={{ color: "var(--text-muted)" }}>Loading…</p>}
            {warnings.length > 0 && (
                <ul style={{ listStyle: "disc", paddingLeft: 18, marginBottom: 12, color: "var(--status-warning, #f0b232)" }}>
                    {warnings.map(w => <li key={w}>{w}</li>)}
                </ul>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", paddingBottom: 12, color: "var(--text-default, var(--text-normal))" }}>
                {rows.map(([label, value]) => (
                    <div key={label} style={{ display: "contents" }}>
                        <strong>{label}</strong>
                        <span style={{ wordBreak: "break-word" }}>{value}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

const menuPatch: NavContextMenuPatchCallback = (children, props: { itemHref?: string; itemText?: string; }) => {
    const code = INVITE.exec(props.itemHref ?? props.itemText ?? "")?.[1];
    if (!code) return;

    children.push(
        <Menu.MenuItem
            id="bz-inspect-invite"
            label="Inspect invite"
            action={() => {
                try {
                    openModal(modal => <InviteModal code={code} modalProps={modal} />);
                } catch (err) {
                    logger.error("Failed to open invite details", err);
                    showToast("Could not open invite details", Toasts.Type.FAILURE);
                }
            }}
        />
    );
};

export default definePlugin({
    name: "InviteInspector",
    description: "Right-click a server invite to see how old the server is, who made the invite and how many people are in it, before you join.",
    tags: ["Privacy", "Servers"],
    searchTerms: ["invite", "server info", "scam", "join"],

    contextMenus: {
        "message": menuPatch
    }
});
