# Writing a Bazinga plugin

A Bazinga plugin is an [Equicord](https://github.com/Equicord/Equicord) plugin that lives in its own folder under
[`plugins/`](../plugins). The build copies every folder there into Equicord, so your plugin shows up on the Plugins page
with a cog, a switch and a search entry like any other.

## Start from the template

1. Copy [`plugins/_template`](../plugins/_template) to `plugins/yourPlugin`. (Folders that start with `_` are helpers
   or templates and are not loaded as plugins.)
2. In `index.tsx`, change `name` and `description`. Keep `name` as the **first property**, written as a plain string:
   the build finds your plugin by reading it from the source.
3. Build and run:

   ```sh
   bun run buildEquicord
   bun start
   ```

   After you change the plugin, run `bun run buildEquicord` again and press Ctrl+R in Bazinga.
4. Search the Plugins page for your plugin and turn it on.

## The rules

Every Bazinga plugin must:

- **Never read, store, log or send the user's Discord token.**
- **Not act for the user.** No sending messages, joining servers or other automated account actions.
- **Not bypass Discord's rate limits or paid features** such as Nitro.
- **Handle its own errors.** Wrap listeners, timers and observers in `guard()`, and React components in
  `ErrorBoundary.wrap`. One broken plugin must not break Discord.
- **Clean up in `stop()`.** Remove every listener, timer, style and element that `start()` added.
- **Have at least one setting**, so it has a cog on the Plugins page.
- **Not copy a plugin Equicord already has.** Check the
  [Equicord plugin list](https://github.com/Equicord/Equicord/tree/main/src/equicordplugins) first.
- **Keep data on the user's computer.** Use `DataStore` for saved data. If a plugin has to contact a server, say so in
  its description.

## The shared helpers

Import these from `../_bazinga`:

| Helper | What it is for |
| ------ | -------------- |
| `definePlugin` | Equicord's `definePlugin`, with the Bazinga author and the "bazinga" search term added |
| `bazingaLogger(name)` | A logger with the Bazinga color |
| `guard(logger, label, fn)` | Wraps a callback so an error is logged instead of thrown |
| `confirmDialog({...})` | A Discord-style dialog that resolves with the button chosen |
| `matchesShortcut(event, "Ctrl+Shift+B")` | Checks a keyboard event against a shortcut written as text |
| `loadFromCdn(url, integrity)` | Loads a pinned script or stylesheet from jsDelivr, checked with Subresource Integrity |
| `fetchBlob(url, maxBytes)` | Downloads a file from https with a size limit |
| `watchMessageContent(logger, fn)` | Calls `fn` for every message text on the page now and later |
| `messageFromElement(el)` | Finds the message a page element belongs to |
| `loadedMessages(channelId)` | The messages Discord has already loaded for a channel |
| `codeBlocks(text, ["json"])` | The bodies of fenced code blocks of the given languages |
| `interceptNotifications(handler)` | Hold back desktop notifications, safely alongside other plugins |
| `setHiddenGuilds(owner, ids)` | Hide servers in the server list, safely alongside other plugins |
| `channelLabel(id)` | "Server › #channel", "@person" or the group name |

Small icons are in `../_bazinga/icons`.

Code that both the app and the plugins need lives in `src/shared`. List the file in `SHARED_FILES` in
`scripts/build/buildEquicord.mts` and the build copies it next to the helpers, so you can import it as
`../_bazinga/<file>`.

## Things that need the main process

Network requests that Discord's security rules would block, and anything that reads or writes files, go in a
`native.ts` next to `index.tsx`. Its exported functions become available to the plugin:

```ts
// native.ts
export async function hello(_: IpcMainInvokeEvent, name: string) {
    return `Hello ${name}`;
}

// index.tsx
const Native = VencordNative.pluginHelpers.YourPluginName as PluginNative<typeof import("./native")>;
await Native.hello("world");
```

The first argument of a native function is always the event. Treat every argument as untrusted input, and check it.
See [`plugins/betterDiscordThemes/native.ts`](../plugins/betterDiscordThemes/native.ts) for an example that checks
file names and addresses.

## Tests

Put logic that does not need Discord into its own file, with no imports from Discord or Equicord, and test it with
`bun test`. See [`tests/template.test.ts`](../tests/template.test.ts). Run all checks with:

```sh
bun run test
```

## Style

- New files start with the license header used by the files around them.
- Keep text for users short and in plain words. Say what happens, not how it works inside.
- After adding or changing a plugin, run `bun run docs` to refresh [PLUGINS.md](PLUGINS.md).

## Sharing your plugin

Open a pull request. See [CONTRIBUTING.md](../CONTRIBUTING.md).
