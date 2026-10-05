# Credits

Bazinga is built on the work of these projects. Thank you to their authors and contributors.

| Project                                                  | How Bazinga uses it                                   | License           |
| -------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| [Equibop](https://github.com/Equicord/Equibop)           | The desktop shell Bazinga is forked from              | GPL-3.0-or-later  |
| [Vesktop](https://github.com/Vencord/Vesktop)            | The project Equibop is forked from                    | GPL-3.0-or-later  |
| [Equicord](https://github.com/Equicord/Equicord)         | Client mod bundled with Bazinga (git submodule)       | GPL-3.0-or-later  |
| [Vencord](https://github.com/Vendicated/Vencord)         | The project Equicord is forked from                   | GPL-3.0-or-later  |
| [OpenAsar](https://github.com/GooseMod/OpenAsar)         | Inspiration for the performance options. No code is copied. | AGPL-3.0    |
| [arrpc-bun](https://github.com/Creationsss/arrpc-bun)    | Rich Presence server                                  | MIT               |
| [Electron](https://github.com/electron/electron)         | Application runtime                                   | MIT               |
| [electron-builder / electron-updater](https://github.com/electron-userland/electron-builder) | Packaging and auto-update | MIT |

Some plugins load these libraries and fonts from jsDelivr when you first use them. Each is pinned to one version, and
scripts and style sheets are checked with Subresource Integrity (the font files a style sheet points to come from the
same pinned version):

| Project | Used by | License |
| ------- | ------- | ------- |
| [KaTeX](https://katex.org/) | MathRender | MIT |
| [Mermaid](https://mermaid.js.org/) | MermaidRender | MIT |
| [jsQR](https://github.com/cozmo/jsQR) | QRCodeReader | Apache-2.0 |
| [Fontsource](https://fontsource.org/) packages for Lexend, OpenDyslexic and Atkinson Hyperlegible | Readability | OFL-1.1 and similar font licenses |
| [BetterDiscord theme store](https://betterdiscord.app/themes) | BetterDiscordThemes lists and installs themes; each theme belongs to its author and keeps its own license | n/a |

Files that come from Vesktop or Equibop keep their original copyright headers. The full license text is in
[LICENSE](LICENSE). Third-party license notices for Electron and Chromium ship with every build.
