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

import { bazingaLogger, definePlugin } from "../_bazinga";
import { extractMath } from "./extract";
import { loadKatex } from "./katex";

const logger = bazingaLogger("MathRender");

const settings = definePluginSettings({
    inline: {
        type: OptionType.BOOLEAN,
        description: "Also render single-dollar math like $x^2$. Off by default because prices like $5 and $10 would match",
        default: false
    }
});

const MathBlock = ErrorBoundary.wrap(({ content }: { content: string; }) => {
    const expressions = extractMath(content, settings.store.inline);
    const [html, setHtml] = useState<string[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!expressions.length) return;
        let cancelled = false;
        loadKatex()
            .then(katex => {
                if (cancelled) return;
                setHtml(expressions.map(({ tex, display }) => katex.renderToString(tex, {
                    displayMode: display,
                    throwOnError: false,
                    // trust: false keeps commands like \href and \includegraphics disabled.
                    trust: false,
                    strict: "ignore",
                    maxSize: 20,
                    maxExpand: 500
                })));
            })
            .catch(err => {
                logger.error("Failed to load KaTeX", err);
                if (!cancelled) setFailed(true);
            });
        return () => { cancelled = true; };
    }, [content]);

    if (!expressions.length || failed || !html) return null;

    return (
        <div className="bz-math">
            {html.map((h, i) => <div key={i} className="bz-math-item" dangerouslySetInnerHTML={{ __html: h }} />)}
        </div>
    );
}, { noop: true });

export default definePlugin({
    name: "MathRender",
    description: "Shows LaTeX math written between $$ … $$ as formatted equations under the message.",
    tags: ["Chat", "Appearance"],
    searchTerms: ["latex", "katex", "math", "equation", "formula"],
    settings,

    renderMessageAccessory: props => {
        const message = props.message as Message;
        return message.content?.includes("$") ? <MathBlock content={message.content} /> : null;
    }
});
