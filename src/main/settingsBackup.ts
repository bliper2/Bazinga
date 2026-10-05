/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/** Everything that makes up a user's setup, except their login. */
export interface SettingsBundle {
    format: "bazinga-settings";
    version: 1;
    /** Bazinga's own settings. */
    bazinga: object;
    /** Equicord's settings.json, as text. */
    equicord: string;
    quickCss: string;
    /** Theme file name to file contents. */
    themes: Record<string, string>;
}

export interface EncryptedBundle {
    encrypted: true;
    salt: string;
    iv: string;
    tag: string;
    data: string;
}

const THEME_FILE = /^[\w\-. ()[\]]+\.css$/;
const MAX_THEME_BYTES = 5 * 1024 * 1024;

const deriveKey = (password: string, salt: Buffer) => scryptSync(password, salt, 32);

export function encryptBundle(bundle: SettingsBundle, password: string): EncryptedBundle {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", deriveKey(password, salt), iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(bundle), "utf-8"), cipher.final()]);

    return {
        encrypted: true,
        salt: salt.toString("base64"),
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        data: data.toString("base64")
    };
}

/** Throws when the password is wrong or the file was changed. */
export function decryptBundle(file: EncryptedBundle, password: string): unknown {
    const decipher = createDecipheriv(
        "aes-256-gcm",
        deriveKey(password, Buffer.from(file.salt, "base64")),
        Buffer.from(file.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(file.tag, "base64"));
    const text = Buffer.concat([decipher.update(Buffer.from(file.data, "base64")), decipher.final()]).toString("utf-8");
    return JSON.parse(text);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/** Checks the shape of an imported file, because it is read from disk and then written into the user's settings. */
export function validateBundle(value: unknown): value is SettingsBundle {
    if (!isObject(value) || value.format !== "bazinga-settings" || value.version !== 1) return false;
    if (!isObject(value.bazinga) || typeof value.equicord !== "string" || typeof value.quickCss !== "string")
        return false;
    if (!isObject(value.themes)) return false;

    try {
        if (value.equicord && !isObject(JSON.parse(value.equicord))) return false;
    } catch {
        return false;
    }

    return Object.entries(value.themes).every(
        ([name, css]) => THEME_FILE.test(name) && typeof css === "string" && css.length <= MAX_THEME_BYTES
    );
}
