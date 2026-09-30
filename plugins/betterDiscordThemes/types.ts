/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface StoreTheme {
    id: number;
    name: string;
    fileName: string;
    description: string;
    version: string;
    author: string;
    likes: number;
    downloads: number;
    tags: string[];
    thumbnail: string | null;
    source: string;
    released: string;
}
