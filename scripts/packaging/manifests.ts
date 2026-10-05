/*
 * Bazinga, a custom Discord desktop client
 * Copyright (c) 2026 bliper2 and Bazinga contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Builds package manager manifests (Scoop, Homebrew, winget, Arch) for a release. They are filled in from the
// release's SHA256SUMS.txt, so the hashes are the ones the release workflow published.

const REPO = "bliper2/Bazinga";
const HOMEPAGE = `https://github.com/${REPO}`;
const DESCRIPTION = "A Discord desktop client with Equicord built in, extra plugins and themes";

export type Checksums = Record<string, string>;

/** Reads a SHA256SUMS file into a map of file name to hash. */
export function parseChecksums(text: string): Checksums {
    const sums: Checksums = {};
    for (const line of text.split(/\r?\n/)) {
        const match = /^([0-9a-f]{64})\s+\*?(.+?)\s*$/i.exec(line);
        if (match) sums[match[2]] = match[1].toLowerCase();
    }
    return sums;
}

const download = (version: string, file: string) => `${HOMEPAGE}/releases/download/v${version}/${file}`;

function need(sums: Checksums, file: string) {
    const hash = sums[file];
    if (!hash) throw new Error(`SHA256SUMS.txt has no entry for ${file}`);
    return hash;
}

export function scoopManifest(version: string, sums: Checksums) {
    const x64 = `Bazinga-${version}-win.zip`;
    const arm64 = `Bazinga-${version}-arm64-win.zip`;
    return (
        JSON.stringify(
            {
                version,
                description: DESCRIPTION,
                homepage: HOMEPAGE,
                license: "GPL-3.0-or-later",
                architecture: {
                    "64bit": { url: download(version, x64), hash: need(sums, x64) },
                    arm64: { url: download(version, arm64), hash: need(sums, arm64) }
                },
                shortcuts: [["bazinga.exe", "Bazinga"]],
                checkver: "github",
                autoupdate: {
                    architecture: {
                        "64bit": { url: `${HOMEPAGE}/releases/download/v$version/Bazinga-$version-win.zip` },
                        arm64: { url: `${HOMEPAGE}/releases/download/v$version/Bazinga-$version-arm64-win.zip` }
                    }
                }
            },
            null,
            4
        ) + "\n"
    );
}

export function homebrewCask(version: string, sums: Checksums) {
    const file = `Bazinga-${version}-universal.dmg`;
    return `cask "bazinga" do
  version "${version}"
  sha256 "${need(sums, file)}"

  url "${HOMEPAGE}/releases/download/v#{version}/Bazinga-#{version}-universal.dmg"
  name "Bazinga"
  desc "${DESCRIPTION}"
  homepage "${HOMEPAGE}"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "Bazinga.app"

  zap trash: [
    "~/Library/Application Support/bazinga",
    "~/Library/Preferences/io.github.bliper2.bazinga.plist",
  ]
end
`;
}

export function archPkgbuild(version: string, sums: Checksums) {
    const x64 = `bazinga-${version}.tar.gz`;
    const arm64 = `bazinga-${version}-arm64.tar.gz`;
    return `# Maintainer: bliper2
pkgname=bazinga-bin
pkgver=${version}
pkgrel=1
pkgdesc="${DESCRIPTION}"
arch=('x86_64' 'aarch64')
url="${HOMEPAGE}"
license=('GPL-3.0-or-later')
depends=('gtk3' 'nss' 'alsa-lib')
provides=('bazinga')
conflicts=('bazinga')
options=('!strip')
source_x86_64=("bazinga-\${pkgver}-x64.tar.gz::${HOMEPAGE}/releases/download/v\${pkgver}/bazinga-\${pkgver}.tar.gz")
source_aarch64=("bazinga-\${pkgver}-arm64.tar.gz::${HOMEPAGE}/releases/download/v\${pkgver}/bazinga-\${pkgver}-arm64.tar.gz")
sha256sums_x86_64=('${need(sums, x64)}')
sha256sums_aarch64=('${need(sums, arm64)}')

package() {
  install -d "\${pkgdir}/opt/bazinga" "\${pkgdir}/usr/bin"
  cp -r "\${srcdir}"/bazinga-*/* "\${pkgdir}/opt/bazinga/"
  ln -s /opt/bazinga/bazinga "\${pkgdir}/usr/bin/bazinga"
}
`;
}

/** The three files winget needs, keyed by file name. */
export function wingetManifests(version: string, sums: Checksums, date: string) {
    const id = "bliper2.Bazinga";
    const installer = (arch: "x64" | "arm64") => {
        const file = `Bazinga-Setup-${version}-${arch}.exe`;
        return `  - Architecture: ${arch}
    InstallerUrl: ${download(version, file)}
    InstallerSha256: ${need(sums, file).toUpperCase()}`;
    };

    return {
        [`${id}.yaml`]: `PackageIdentifier: ${id}
PackageVersion: ${version}
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.6.0
`,
        [`${id}.installer.yaml`]: `PackageIdentifier: ${id}
PackageVersion: ${version}
InstallerType: nullsoft
Scope: user
ReleaseDate: ${date}
Installers:
${installer("x64")}
${installer("arm64")}
ManifestType: installer
ManifestVersion: 1.6.0
`,
        [`${id}.locale.en-US.yaml`]: `PackageIdentifier: ${id}
PackageVersion: ${version}
PackageLocale: en-US
Publisher: bliper2
PackageName: Bazinga
PackageUrl: ${HOMEPAGE}
License: GPL-3.0-or-later
LicenseUrl: ${HOMEPAGE}/blob/main/LICENSE
ShortDescription: ${DESCRIPTION}
ManifestType: defaultLocale
ManifestVersion: 1.6.0
`
    };
}
