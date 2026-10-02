/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";

import { codeBlocks, definePlugin } from "../_bazinga";

const MAX_LENGTH = 200_000;

const settings = definePluginSettings({
    expandDepth: {
        type: OptionType.NUMBER,
        description: "How many levels of the tree start expanded",
        default: 1
    }
});

function Leaf({ value }: { value: unknown; }) {
    if (value === null) return <span className="bz-json-null">null</span>;
    if (typeof value === "string") return <span className="bz-json-string">{JSON.stringify(value)}</span>;
    if (typeof value === "number") return <span className="bz-json-number">{value}</span>;
    return <span className="bz-json-bool">{String(value)}</span>;
}

function Node({ name, value, depth }: { name?: string; value: unknown; depth: number; }) {
    const label = name !== undefined && <span className="bz-json-key">{JSON.stringify(name)}: </span>;

    if (value === null || typeof value !== "object") {
        return <div className="bz-json-row">{label}<Leaf value={value} /></div>;
    }

    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
    const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];

    return (
        <details className="bz-json-node" open={depth < settings.store.expandDepth}>
            <summary>
                {label}{open}<span className="bz-json-count"> {entries.length} {entries.length === 1 ? "item" : "items"} </span>{close}
            </summary>
            <div className="bz-json-children">
                {entries.map(([k, v]) => <Node key={k} name={Array.isArray(value) ? undefined : k} value={v} depth={depth + 1} />)}
            </div>
        </details>
    );
}

function parseBlocks(content: string) {
    const parsed: unknown[] = [];
    for (const block of codeBlocks(content, ["json", "json5", "jsonc"])) {
        if (block.length > MAX_LENGTH) continue;
        try {
            parsed.push(JSON.parse(block));
        } catch {
            // Not valid JSON; Discord already shows the raw block.
        }
    }
    return parsed;
}

const JsonTrees = ErrorBoundary.wrap(({ content }: { content: string; }) => {
    const trees = parseBlocks(content);
    if (!trees.length) return null;
    return (
        <div className="bz-json">
            {trees.map((t, i) => <Node key={i} value={t} depth={0} />)}
        </div>
    );
}, { noop: true });

export default definePlugin({
    name: "JsonPrettify",
    description: "Shows ```json code blocks as a collapsible tree you can explore.",
    tags: ["Chat", "Developers"],
    searchTerms: ["json", "tree", "pretty", "format", "code"],
    settings,

    renderMessageAccessory: props => {
        const message = props.message as Message;
        return message.content?.includes("```json") ? <JsonTrees content={message.content} /> : null;
    }
});
