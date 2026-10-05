/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Writes package manager manifests for a release into packaging/<version>/.
//   bun run packaging 0.2.0
// It reads SHA256SUMS.txt from that release on GitHub. Use --sums <file> to read a local file instead.
// Nothing is submitted anywhere: copy the files to the package manager's repository yourself.

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { archPkgbuild, homebrewCask, parseChecksums, scoopManifest, wingetManifests } from "./manifests";

const ROOT = join(import.meta.dirname, "../..");

const version = process.argv[2]?.replace(/^v/, "");
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error("Usage: bun run packaging <version> [--sums <file>]   for example: bun run packaging 0.2.0");
    process.exit(1);
}

const sumsFlag = process.argv.indexOf("--sums");
const sumsText =
    sumsFlag > 0
        ? readFileSync(process.argv[sumsFlag + 1], "utf-8")
        : await fetch(`https://github.com/bliper2/Bazinga/releases/download/v${version}/SHA256SUMS.txt`).then(r => {
              if (!r.ok) throw new Error(`Could not download SHA256SUMS.txt for v${version} (HTTP ${r.status}). Is the release published?`);
              return r.text();
          });
const sums = parseChecksums(sumsText);

const out = join(ROOT, "packaging", version);
const files: Record<string, string> = {
    "scoop/bazinga.json": scoopManifest(version, sums),
    "homebrew/bazinga.rb": homebrewCask(version, sums),
    "arch/PKGBUILD": archPkgbuild(version, sums)
};
for (const [name, text] of Object.entries(wingetManifests(version, sums, new Date().toISOString().slice(0, 10)))) {
    files[`winget/${name}`] = text;
}

for (const [name, text] of Object.entries(files)) {
    const path = join(out, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text);
    console.log(`Wrote packaging/${version}/${name}`);
}
