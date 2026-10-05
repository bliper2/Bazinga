# Changelog

## 0.2.0

### App

- **Profiles:** run several accounts side by side with `--profile name`, or from Settings, Profiles.
- **Safe mode:** `--safe-mode` starts with every plugin and theme off and saves nothing. It starts by itself after
  three starts in a row that failed.
- `--branch stable|ptb|canary` picks a Discord branch for one session.
- **Reload client** in the tray menu, and Ctrl+R and F5 reload the page.
- **Performance:** presets (balanced, performance, battery saver), a low-end mode, and network-level blocking of
  Discord's analytics and crash reports. Settings show how long startup took, and the tray shows memory use.
- Global shortcuts to show or hide the window and to mute.
- **Backup:** export and import all settings, Equicord plugins and settings, QuickCSS and themes as one file, with an
  optional password.
- Restore the bundled Equicord, copy debug info for bug reports, and a `portable.txt` file to force portable mode.
- After an update, Bazinga offers to open what changed.
- **Smaller installer:** the Rich Presence helper (about 100 MB) is no longer inside the installers. Bazinga downloads
  it from the release, checked against `SHA256SUMS.txt`, the first time Rich Presence is turned on. The Windows
  installer is now one per CPU type (x64 and ARM64) and is about half the size. If you used Rich Presence in 0.1.0,
  open Settings, Rich Presence and press Download once after updating.
- Every release now has a `SHA256SUMS.txt`, and its notes come from this file.

### Plugins (38 new, 63 in total)

- Privacy and safety: MassMentionShield, ImpersonationAlert, InviteInspector, ShortenerExpander, BlockLog. SecretLeakGuard
  also checks files that usually hold secrets, AttachmentScanner asks before downloading programs, ScreenshotMode can turn
  on while screen sharing, and LinkGuard flags gift-scam wording.
- Chat and reading: Readability, ZalgoFilter, SpamCollapse, HighlightWords, ScriptBadge, ChannelStats, RegexTester,
  MarkdownCheatsheet, SnippetLibrary, EmojiUsageStats.
- Organisation: ColorLabels, BookmarkTags, MessageTodos, BirthdayReminders, UsageStats, FocusSessions,
  WorkspaceProfiles, RecentChannels, CalendarEvents.
- Media: ChannelGallery, UploadShrink, ImageColorPicker, ImageCompare, GifFrameViewer, SvgPreview.
- Accessibility: HighContrastFocus, LiveRegionMessages, ColorBlindModes, ReadAloud.
- Tools: AutoReload (reloads after turning on a plugin that needs it), LowEndMode, ThemeStudio, ThemeScheduler.
- The BetterDiscord theme browser gains favorites.

### Themes

- Four new themes by orgeco: Halloween, Winter, Spring and Summer (16 in total).
- Theme Studio makes your own themes with a live preview.

### Project

- Plugin template and a guide: `docs/WRITING_PLUGINS.md`. The plugin list in `docs/PLUGINS.md` is generated.
- Unit tests for plugin logic run in CI.

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
