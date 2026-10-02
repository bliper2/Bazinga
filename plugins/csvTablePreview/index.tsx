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

import { bazingaLogger, codeBlocks, definePlugin } from "../_bazinga";
import { parseCsv } from "./csv";

const logger = bazingaLogger("CsvTablePreview");

const MAX_ATTACHMENT_BYTES = 512 * 1024;

const settings = definePluginSettings({
    maxRows: {
        type: OptionType.NUMBER,
        description: "Most rows to show in a preview",
        default: 50
    },
    previewAttachments: {
        type: OptionType.BOOLEAN,
        description: "Also preview .csv and .tsv file attachments (up to 512 KB)",
        default: true
    }
});

function Table({ rows, title }: { rows: string[][]; title?: string; }) {
    if (!rows.length) return null;
    const [header, ...body] = rows;
    return (
        <div className="bz-csv">
            {title && <div className="bz-csv-title">{title}</div>}
            <table>
                <thead>
                    <tr>{header.map((cell, i) => <th key={i}>{cell}</th>)}</tr>
                </thead>
                <tbody>
                    {body.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}
                </tbody>
            </table>
            {rows.length >= settings.store.maxRows && <div className="bz-csv-more">Showing the first {settings.store.maxRows} rows.</div>}
        </div>
    );
}

function AttachmentTable({ url, name, size }: { url: string; name: string; size: number; }) {
    const [rows, setRows] = useState<string[][] | null>(null);

    useEffect(() => {
        if (size > MAX_ATTACHMENT_BYTES) return;
        let cancelled = false;
        // Discord's attachment CDN allows the app to read text files, as it does for its own text previews.
        fetch(url)
            .then(r => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then(text => !cancelled && setRows(parseCsv(text, settings.store.maxRows)))
            .catch(err => logger.warn(`Could not load ${name}`, err));
        return () => { cancelled = true; };
    }, [url]);

    return rows ? <Table rows={rows} title={name} /> : null;
}

const Previews = ErrorBoundary.wrap(({ message }: { message: Message; }) => {
    const blocks = codeBlocks(message.content ?? "", ["csv", "tsv"]);
    const files = settings.store.previewAttachments
        ? (message.attachments ?? []).filter(a => /\.(csv|tsv)$/i.test(a.filename))
        : [];
    if (!blocks.length && !files.length) return null;

    return (
        <>
            {blocks.map((b, i) => <Table key={i} rows={parseCsv(b, settings.store.maxRows)} />)}
            {files.map(f => <AttachmentTable key={f.id} url={f.url} name={f.filename} size={f.size} />)}
        </>
    );
}, { noop: true });

export default definePlugin({
    name: "CsvTablePreview",
    description: "Shows ```csv code blocks and .csv attachments as tables.",
    tags: ["Chat", "Media"],
    searchTerms: ["csv", "table", "spreadsheet", "tsv"],
    settings,

    renderMessageAccessory: props => {
        const message = props.message as Message;
        const hasCsv = message.content?.includes("```csv") || message.content?.includes("```tsv")
            || message.attachments?.some(a => /\.(csv|tsv)$/i.test(a.filename));
        return hasCsv ? <Previews message={message} /> : null;
    }
});
