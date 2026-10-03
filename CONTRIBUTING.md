# Contributing to Bazinga

Thanks for helping! Bug reports, plugin ideas, themes and pull requests are all welcome.

## Getting set up

Follow [Setup](README.md#setup) and [Build and run](README.md#build-and-run) in the README. In short:

```sh
git clone --recurse-submodules https://github.com/bliper2/Bazinga
cd Bazinga
bun install
bun run buildEquicord
bun start
```

Run `bun run test` (lint and type check) before opening a pull request.

## Ground rules for plugins

Every Bazinga plugin must:

- **Never read, store, log or send the user's Discord token.**
- **Not act on the user's behalf.** No sending messages, joining servers or other automated account actions
  (self-bot behavior).
- **Not bypass Discord's rate limits or paid features** such as Nitro.
- Handle its own errors. Wrap DOM listeners, timers and observers with `guard()` from `plugins/_bazinga`, and React
  components with `ErrorBoundary.wrap`.
- Have at least one setting, so it appears with a cog on the Plugins page.
- Not duplicate a plugin Equicord already ships. Check the
  [Equicord plugin list](https://github.com/Equicord/Equicord/tree/main/src/equicordplugins) first.

See [Writing plugins](README.md#writing-plugins) for how a plugin is structured.

## Themes

Bundled themes live in [`src/main/bundledThemes.ts`](src/main/bundledThemes.ts) as color palettes. When you change
a palette or the shared template, bump the theme's `version`, otherwise existing installs keep their old file.

## Pull requests

- Keep each pull request focused on one change.
- Match the style of the surrounding code. `bun run lint:fix` fixes formatting.
- New source files need the license header used by the files around them.

By contributing you agree that your contribution is licensed under GPL-3.0-or-later, like the rest of the project.
