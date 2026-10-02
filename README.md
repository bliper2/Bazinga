# Bazinga

Bazinga is a custom Discord desktop client for Windows, macOS and Linux. It loads Discord's web client in its own
Electron shell with [Equicord](https://github.com/Equicord/Equicord) built in and enabled by default, so you do not
need to patch the official Discord app.

Bazinga is a fork of [Equibop](https://github.com/Equicord/Equibop), which is a fork of
[Vesktop](https://github.com/Vencord/Vesktop). See [CREDITS.md](CREDITS.md).

> [!WARNING]
> Client modifications are against Discord's Terms of Service. Discord has not been known to ban for them, but you use
> Bazinga at your own risk.

## Features

- Equicord preinstalled, including the Bazinga plugins from [`plugins/`](plugins). Search the Plugins page for
  "bazinga" to list them.
- Discord Stable, PTB and Canary. Pick one on first launch or under **Settings → Bazinga Settings → Discord Branch**.
  Switching reloads the client right away. Each branch keeps its own login.
- App updates through GitHub Releases (electron-updater)
- Equicord updates on its own, from **Settings → Equicord → Updater**, without reinstalling the app
- The installer ships an Equicord build, so the first launch works offline
- Everything from Equibop: Linux screen share with audio, Wayland, arRPC, tray customization

### Bazinga plugins

| Plugin                  | What it does                                                                                    | On by default |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ------------- |
| **BetterDiscordThemes** | Browse, search, preview and install every theme from the BetterDiscord theme store. Open it from Settings, BetterDiscord Themes | Yes |
| **LinkGuard**           | Warns before opening links that imitate other sites, hide their real address or point to raw IPs. Works offline | Yes |
| **ChannelNotes**        | Private notes per channel or DM, from a button in the channel toolbar                          | No            |
| **CollapseLong**        | Collapses very long messages. Click one to expand it                                            | No            |
| **PerfOverlay**         | Overlay with FPS, JavaScript heap, page size and blocking tasks                                 | No            |
| **ScreenshotMode**      | Blurs names, profile pictures and optionally messages and server icons. Ctrl+Shift+B or the eye button | No |
| **SecretLeakGuard**     | Asks before you send something that looks like a password, API key, token or card number      | Yes           |
| **AttachmentScanner**   | Warns under attachments that can run code or hide their real type (`.exe`, `photo.jpg.exe`)    | Yes           |
| **ExifStripWarning**    | Warns before you upload a photo containing GPS location and can remove it without re-encoding | Yes           |
| **AccountAgeBadge**     | Marks accounts younger than 30 days in chat and the member list                                 | No            |
| **QuietHours**          | Silences notifications and their sounds during set hours, without changing your status         | No            |
| **DraftCenter**         | Title-bar button listing unsent drafts from every channel, to open or discard                   | No            |
| **Reminders**           | Right-click a message, Remind me, and get a notification later                                  | No            |
| **ScratchPad**          | A notepad you can open from the title bar anywhere in Discord                                   | No            |
| **MathRender**          | Shows LaTeX between `$$ … $$` as formatted equations (KaTeX, loaded on first use)               | No            |
| **CopyAsMarkdown**      | Right-click, Copy as Markdown: quote with author and a link back                                | No            |
| **ReplyChainViewer**    | Right-click a reply, View reply chain, to see the whole conversation                           | No            |
| **ReadingTime**         | "3 min read" next to long messages                                                              | No            |
| **Censor**              | Hides words you choose in messages, on your screen only                                         | No            |
| **JsonPrettify**        | ```` ```json ```` blocks as a collapsible tree                                                  | No            |
| **CsvTablePreview**     | ```` ```csv ```` blocks and .csv attachments as tables                                          | No            |
| **MermaidRender**       | ```` ```mermaid ```` blocks as diagrams (Mermaid, loaded on first use)                          | No            |
| **QRCodeReader**        | Right-click an image, Scan QR code, with a scam-link warning                                    | No            |
| **PinSearch**           | Channel toolbar button to search pinned messages                                                | No            |
| **WorldClock**          | Title-bar clock for the time zones you choose                                                   | No            |

### Themes by orgeco

Bazinga ships 12 themes made by orgeco. They appear under **Settings → Themes** after the first launch:
Bazinga Midnight, Orgeco Neon, Mocha, Forest, Ocean, Sunset, Crimson, Gold and AMOLED (dark), plus
Orgeco Sakura, Arctic and Lavender (light). They are defined in [`src/main/bundledThemes.ts`](src/main/bundledThemes.ts) and written to the
themes folder on startup. A theme file is only replaced when its version in that file goes up, so local edits are kept.

To change any orgeco theme's accent color, add this to QuickCSS (**Settings → Themes → Edit QuickCSS**):

```css
html:root { --bz-accent: #ff66aa; --bz-accent-hover: #ff8cc0; }
```

Planned (see the roadmap below): performance settings, telemetry blocking, reload shortcuts, more plugins.

## Setup

You need:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 22 or newer
- [Bun](https://bun.sh/) 1.3 or newer (`npm install -g --allow-scripts=bun bun`)
- Linux only: `libglib2.0-dev` (or your distribution's equivalent)

Clone with the Equicord submodule and install dependencies:

```sh
git clone --recurse-submodules https://github.com/bliper2/Bazinga
cd Bazinga
bun install
```

If you already cloned without submodules, run `git submodule update --init`.

## Build and run

```sh
bun run buildEquicord   # build Equicord + our plugins into dist/equicord/equibop.asar
bun start               # build the client and start it
```

When you run from source, the client loads `dist/equicord/equibop.asar` directly. After you change a plugin, run
`bun run buildEquicord` again and reload the client (`Ctrl+Shift+R`).

Other commands:

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `bun run start:dev`   | Start a development build                                |
| `bun run test`        | Lint and type-check                                      |
| `bun run package:dir` | Build an unpacked app in `dist/<platform>-unpacked`      |
| `bun run package`     | Build installers for the current platform into `dist/`   |

Set `EQUICORD_USER_DATA_DIR=/some/folder` to run with a separate profile, for example to test a clean first launch.

## How the pieces fit

```
src/                  Electron shell (main process, preload, renderer settings page)
equicord/             Git submodule: upstream Equicord, pinned to a release tag
plugins/              Our Equicord plugins. Copied into equicord/src/userplugins at build time
scripts/build/buildEquicord.mts
                      Builds Equicord with our plugins and points its updater at this repo
```

Equicord is loaded from, in order:

1. A custom folder set in **Bazinga Settings → Developer Options**
2. When running from source: `dist/equicord/equibop.asar`
3. `<user data>/sessionData/equicord.asar`. On first launch this is copied from the build shipped in the installer. If
   that is missing, it is downloaded from the `equicord-latest` release.

## Releases

There are two release channels in this repository:

- **App:** push a tag like `v0.1.0`. The `Release` workflow builds installers for all platforms and publishes them as a
  draft release. Publish the draft on GitHub to make it available to the auto-updater. Bump `version` in
  `package.json` before tagging.
- **Equicord:** every push to `main` that changes `plugins/`, the `equicord` submodule or the Equicord build script
  runs the `Equicord build` workflow. It replaces the asset on the `equicord-latest` prerelease. Clients pick it up
  from Equicord's Updater tab. It is a prerelease so the app updater ignores it.

Builds are not code-signed yet. Windows SmartScreen and macOS Gatekeeper will warn on install, and auto-update on
macOS does not work without signing.

## Updating upstream

```sh
git fetch upstream
git merge upstream/main                        # Equibop changes

cd equicord && git fetch --tags && git checkout <new tag> && cd ..
git add equicord                               # Equicord bump
bun run buildEquicord                          # fails loudly if our updater patch no longer applies
```

If Equicord changes its pnpm version, run `bun add -d pnpm@<version>` to match its `packageManager` field.

## Writing plugins

A Bazinga plugin is an Equicord user plugin in its own folder under `plugins/`. Import `definePlugin` from
`../_bazinga` instead of `@utils/types`: it adds the Bazinga author and the "bazinga" search term. Keep `name` as the
first property with a plain string value, because Equicord's build reads it from the source. Code that needs the
main process (network requests without CORS, file access) goes in `native.ts`. See
[`plugins/betterDiscordThemes`](plugins/betterDiscordThemes) for an example.

Wrap DOM listeners, timers and observers with `guard()` from `../_bazinga`, so an error is logged instead of breaking
Discord. Wrap React components with `ErrorBoundary.wrap`.

A full template and guide arrive in Phase 4.

## Roadmap

- [x] Phase 2: base client, Equicord injection, app and Equicord auto-update, PTB and Canary
- [x] BetterDiscord theme browser and the first 4 custom plugins (moved ahead of Phase 3)
- [ ] Phase 3: performance layer, hot reload, plugin manager and theme manager additions
- [ ] Phase 4: plugin template and guide, remaining custom plugins

## License

Bazinga is licensed under the [GNU General Public License v3.0 or later](LICENSE), like the projects it is built on.
Source code for every release, including the exact Equicord commit used, is available in this repository.
