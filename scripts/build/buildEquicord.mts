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
const UPDATER_FILE = join(EQUICORD, "src/main/updater/http.ts");
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

// Upstream's updater reads /releases/latest, which in our repo is the app release.
// Point it at the dedicated Equicord prerelease tag instead.
const originalUpdater = readFileSync(UPDATER_FILE, "utf-8");
const patchedUpdater = originalUpdater.replace('githubGet("/releases/latest")', `githubGet("/releases/tags/${EQUICORD_RELEASE_TAG}")`);
if (patchedUpdater === originalUpdater) throw new Error(`Could not patch ${UPDATER_FILE}; upstream code changed`);

// Equicord pins its pnpm version. We run the matching pnpm from our devDependencies through node,
// because pnpm's native launcher needs a postinstall step that bun and npm may skip.
const wantedPnpm = JSON.parse(readFileSync(join(EQUICORD, "package.json"), "utf-8")).packageManager.split("@")[1];
const installedPnpm = JSON.parse(readFileSync(join(ROOT, "node_modules/pnpm/package.json"), "utf-8")).version;
if (wantedPnpm !== installedPnpm)
    throw new Error(`Equicord needs pnpm ${wantedPnpm} but ${installedPnpm} is installed. Run: bun add -d pnpm@${wantedPnpm}`);
const pnpm = `node "${join(ROOT, "node_modules/pnpm/bin/pnpm.mjs")}"`;

// The updater compares this hash against our repo's commits, so it must be a Bazinga commit.
const bazingaHash = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();

writeFileSync(UPDATER_FILE, patchedUpdater);
try {
    run(`${pnpm} install --frozen-lockfile`, EQUICORD);
    run(`${pnpm} build --standalone`, EQUICORD, { EQUICORD_REMOTE: REPO_SLUG, EQUICORD_HASH: bazingaHash });
} finally {
    writeFileSync(UPDATER_FILE, originalUpdater);
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(join(EQUICORD, "dist/equibop.asar"), join(OUT_DIR, "equibop.asar"));
writeFileSync(join(OUT_DIR, "hash.txt"), bazingaHash);
console.log(`Built ${join(OUT_DIR, "equibop.asar")} (${bazingaHash})`);
