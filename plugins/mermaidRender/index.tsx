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
import { useEffect, useState } from "@webpack/common";

import { bazingaLogger, codeBlocks, definePlugin, loadFromCdn } from "../_bazinga";

const logger = bazingaLogger("MermaidRender");

// Mermaid is large (about 5 MB), so it loads only the first time a diagram is shown.
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.1.0/dist/mermaid.min.js";
const MERMAID_INTEGRITY = "sha384-EbBpjO7rlR6eqZEcG7GaPpyk9H9WrMyPWX4d3KvPYltgt8Z8l0z6R56B1qP40pR4";
const MAX_LENGTH = 10_000;

const settings = definePluginSettings({
    theme: {
        type: OptionType.SELECT,
        description: "Diagram colors",
        options: [
            { label: "Dark", value: "dark", default: true },
            { label: "Light", value: "default" },
            { label: "Neutral", value: "neutral" }
        ]
    }
});

let renderCount = 0;
let configuredTheme: string | null = null;

async function renderDiagram(source: string) {
    await loadFromCdn(MERMAID_URL, MERMAID_INTEGRITY);
    const { mermaid } = (window as any);
    if (configuredTheme !== settings.store.theme) {
        // "strict" sanitizes labels and disables click handlers and scripts inside diagrams.
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: settings.store.theme });
        configuredTheme = settings.store.theme;
    }
    const { svg } = await mermaid.render(`bz-mermaid-${++renderCount}`, source);
    return svg as string;
}

const Diagram = ErrorBoundary.wrap(({ source }: { source: string; }) => {
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        renderDiagram(source)
            .then(result => !cancelled && setSvg(result))
            .catch(err => {
                logger.warn("Could not render diagram", err);
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            });
        return () => { cancelled = true; };
    }, [source]);

    if (error) return <div className="bz-mermaid bz-mermaid-error">Diagram error: {error.split("\n")[0]}</div>;
    if (!svg) return null;
    return <div className="bz-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}, { noop: true });

export default definePlugin({
    name: "MermaidRender",
    description: "Draws ```mermaid code blocks (flowcharts, sequence diagrams, charts) as diagrams under the message.",
    tags: ["Chat", "Developers"],
    searchTerms: ["mermaid", "diagram", "flowchart", "chart"],
    settings,

    renderMessageAccessory: props => {
        const message = props.message as Message;
        if (!message.content?.includes("```mermaid")) return null;
        const blocks = codeBlocks(message.content, ["mermaid"]).filter(b => b.trim() && b.length <= MAX_LENGTH);
        return blocks.length ? <>{blocks.map((b, i) => <Diagram key={i} source={b} />)}</> : null;
    }
});
