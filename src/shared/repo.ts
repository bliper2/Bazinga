/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const REPO_SLUG = "bliper2/Bazinga";

// Prerelease tag that holds our Equicord build. Being a prerelease keeps it out of
// /releases/latest, which electron-updater uses for app updates.
export const EQUICORD_RELEASE_TAG = "equicord-latest";

export const EQUICORD_ASAR_URL = `https://github.com/${REPO_SLUG}/releases/download/${EQUICORD_RELEASE_TAG}/equibop.asar`;
