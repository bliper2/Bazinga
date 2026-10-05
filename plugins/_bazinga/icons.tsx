/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Small icons for the Bazinga plugins, drawn as plain shapes. They follow the text color.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: string; color?: string; };

function makeIcon(path: string) {
    return function Icon({ size: _size, color: _color, width = 24, height = 24, ...rest }: IconProps) {
        return (
            <svg viewBox="0 0 24 24" width={width} height={height} fill="currentColor" aria-hidden="true" {...rest}>
                <path d={path} />
            </svg>
        );
    };
}

export const BookmarkIcon = makeIcon("M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z");
export const ChecklistIcon = makeIcon("M3 5h2v2H3zm4 0h14v2H7zM3 11h2v2H3zm4 0h14v2H7zM3 17h2v2H3zm4 0h14v2H7z");
export const TimerIcon = makeIcon("M12 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 4v5l3.5 2-.8 1.3L11 14V8zM9 1h6v2H9z");
export const GridIcon = makeIcon("M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z");
export const HistoryIcon = makeIcon("M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.41 1.41A9 9 0 1 0 13 3zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z");
export const ChartIcon = makeIcon("M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z");
