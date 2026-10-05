/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Builds the Equicord submodule with our plugins included and our repo set as the update source.
// Output: dist/equicord/equibop.asar (the file the client loads and Equicord's updater replaces).

import { execSync } from "child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { EQUICORD_RELEASE_TAG, REPO_SLUG } from "../../src/shared/repo";

const ROOT = join(import.meta.dirname, "../..");
const EQUICORD = join(ROOT, "equicord");
const PLUGINS = join(ROOT, "plugins");
const USERPLUGINS = join(EQUICORD, "src/userplugins");
const OUT_DIR = join(ROOT, "dist/equicord");

const run = (cmd: string, cwd: string, env: NodeJS.ProcessEnv = {}) =>
    execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, ...env } });

if (!existsSync(join(EQUICORD, "package.json"))) run("git submodule update --init equicord", ROOT);

// Our plugins are Equicord userplugins. src/userplugins is gitignored upstream and owned by this script.
rmSync(USERPLUGINS, { recursive: true, force: true });
mkdirSync(USERPLUGINS, { recursive: true });
if (existsSync(PLUGINS)) {
    for (const entry of readdirSync(PLUGINS, { withFileTypes: true })) {
        if (entry.isDirectory()) cpSync(join(PLUGINS, entry.name), join(USERPLUGINS, entry.name), { recursive: true });
    }
}

// Code that the app and the plugins both use lives in src/shared. Copy it next to the shared plugin helpers
// so plugins can import it as ../_bazinga/<file>. These copies are generated and not committed.
const SHARED_FILES = ["themeTemplate.ts"];
mkdirSync(join(USERPLUGINS, "_bazinga"), { recursive: true });
for (const file of SHARED_FILES) copyFileSync(join(ROOT, "src/shared", file), join(USERPLUGINS, "_bazinga", file));

// Small edits to upstream Equicord. Each one must match exactly once, so a change upstream fails the build loudly
// instead of silently shipping a broken feature.
const PATCHES = [
    {
        // Upstream's updater reads /releases/latest, which in our repo is the app release.
        // Point it at the dedicated Equicord prerelease tag instead.
        file: join(EQUICORD, "src/main/updater/http.ts"),
        from: 'githubGet("/releases/latest")',
        to: `githubGet("/releases/tags/${EQUICORD_RELEASE_TAG}")`
    },
    {
        // Safe mode: the app sends `__bazingaSafeMode` with the settings. Plugins that are on by default and were
        // never saved to the settings file would otherwise still start.
        file: join(EQUICORD, "src/api/Settings.ts"),
        from: "enabled: IS_REPORTER || plugins[key].required || plugins[key].enabledByDefault || false",
        to: "enabled: IS_REPORTER || plugins[key].required || (plugins[key].enabledByDefault && !(settings as any).__bazingaSafeMode) || false"
    }
];

const originals = PATCHES.map(patch => readFileSync(patch.file, "utf-8"));
const patched = PATCHES.map((patch, i) => {
    if (originals[i].split(patch.from).length !== 2) {
        throw new Error(`Could not patch ${patch.file}; upstream code changed`);
    }
    return originals[i].replace(patch.from, () => patch.to);
});

// Equicord pins its pnpm version. We run the matching pnpm from our devDependencies through node,
// because pnpm's native launcher needs a postinstall step that bun and npm may skip.
const wantedPnpm = JSON.parse(readFileSync(join(EQUICORD, "package.json"), "utf-8")).packageManager.split("@")[1];
const installedPnpm = JSON.parse(readFileSync(join(ROOT, "node_modules/pnpm/package.json"), "utf-8")).version;
if (wantedPnpm !== installedPnpm)
    throw new Error(`Equicord needs pnpm ${wantedPnpm} but ${installedPnpm} is installed. Run: bun add -d pnpm@${wantedPnpm}`);
const pnpm = `node "${join(ROOT, "node_modules/pnpm/bin/pnpm.mjs")}"`;

// The updater compares this hash against our repo's commits, so it must be a Bazinga commit.
const bazingaHash = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();

PATCHES.forEach((patch, i) => writeFileSync(patch.file, patched[i]));
try {
    run(`${pnpm} install --frozen-lockfile`, EQUICORD);
    run(`${pnpm} build --standalone`, EQUICORD, { EQUICORD_REMOTE: REPO_SLUG, EQUICORD_HASH: bazingaHash });
} finally {
    PATCHES.forEach((patch, i) => writeFileSync(patch.file, originals[i]));
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(join(EQUICORD, "dist/equibop.asar"), join(OUT_DIR, "equibop.asar"));
writeFileSync(join(OUT_DIR, "hash.txt"), bazingaHash);
console.log(`Built ${join(OUT_DIR, "equibop.asar")} (${bazingaHash})`);
