/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Guesses the delimiter from the first line: comma, semicolon or tab. */
function detectDelimiter(text: string) {
    const firstLine = text.split("\n", 1)[0];
    const counts = [",", ";", "\t"].map(d => [d, firstLine.split(d).length] as const);
    return counts.sort((a, b) => b[1] - a[1])[0][0];
}

/** Parses CSV with quoted fields ("a, b" and doubled "" quotes). Stops after `maxRows` rows. */
export function parseCsv(text: string, maxRows: number): string[][] {
    const delimiter = detectDelimiter(text);
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length && rows.length < maxRows; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (c === '"') {
                quoted = false;
            } else {
                field += c;
            }
        } else if (c === '"' && field === "") {
            quoted = true;
        } else if (c === delimiter) {
            row.push(field);
            field = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += c;
        }
    }
    if ((field || row.length) && rows.length < maxRows) {
        row.push(field);
        rows.push(row);
    }
    return rows.filter(r => r.some(cell => cell.trim()));
}
