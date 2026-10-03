# Changelog

## 0.1.0

The first release of Bazinga.

### App

- Standalone Discord client for Windows, macOS and Linux, forked from Equibop, with Equicord built in.
- Discord Stable, PTB and Canary. Switching branches applies right away, without a restart.
- App updates from GitHub Releases. Equicord and the Bazinga plugins update separately from the Updater tab.
- The installer includes an Equicord build, so the first launch works offline. App updates replace it automatically.
- New logo and an animated loading screen.
- `bazinga.exe --quit` closes a running Bazinga cleanly. The build scripts use it, so rebuilding no longer logs you out.
- Smaller install: the Rich Presence helper is no longer packed twice.

### Themes by orgeco

12 themes, listed under Settings, Themes: Bazinga Midnight, Orgeco Neon, Mocha, Forest, Ocean, Sunset, Crimson,
Gold, AMOLED, Sakura, Arctic and Lavender. Their accent color can be changed from QuickCSS.

### Plugins

25 Bazinga plugins. Search the Plugins page for "bazinga".

- Safety and privacy: LinkGuard, SecretLeakGuard, AttachmentScanner, ExifStripWarning, AccountAgeBadge,
  ScreenshotMode, QRCodeReader, Censor
- Themes: BetterDiscordThemes (browse and install every theme from the BetterDiscord store)
- Organisation: ChannelNotes, ScratchPad, Reminders, DraftCenter, PinSearch, CopyAsMarkdown, ReplyChainViewer
- Reading and rendering: CollapseLong, ReadingTime, MathRender, MermaidRender, JsonPrettify, CsvTablePreview
- Utility: QuietHours, WorldClock, PerfOverlay

### Known issues

- Builds are not code-signed. Windows SmartScreen and macOS Gatekeeper show a warning, and auto-update on macOS
  does not work without signing.
- Some plugins were tested only outside a logged-in session. Please report anything that misbehaves.
