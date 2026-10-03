# Security policy

## Reporting a vulnerability

Please report security problems privately through
[GitHub's private vulnerability reporting](https://github.com/bliper2/Bazinga/security/advisories/new),
not in a public issue. Include steps to reproduce and the Bazinga version.

Never include your Discord token, passwords or other secrets in a report.

## What Bazinga promises

- Bazinga and its plugins never read, store, log or send your Discord token.
- Plugins that load extra libraries (MathRender, MermaidRender, QRCodeReader) load pinned versions from jsDelivr,
  checked with Subresource Integrity, so a modified file is refused.
- Theme downloads from the BetterDiscord store are only accepted from `raw.githubusercontent.com` and are saved
  only inside your themes folder.

## Supported versions

Only the latest release receives fixes.
