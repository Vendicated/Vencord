# Live Discord Sessions

- Run Chromium and use the Chrome Devtools MCP to control it
- Build the web extension with `pnpm buildWeb --dev` and install it from `dist/chromium-unpacked`. Rebuild and reload as needed
- Navigate to `https://canary.discord.com/app`
- Ensure the ConsoleShortcuts plugin is enabled. Run `Vencord.Settings.plugins.ConsoleShortcuts.enabled = true` to enable it
It exports many useful helpers as `window.shortcutList`
- Ensure a user is logged in. `AuthenticationStore.getId()` should return an id once Discord loaded. If not, ask the user to log in. Using an alt account is recommended

## Reverse Engineering

Discord uses React and Webpack.

Many modules are lazy-loaded, most notably most context menus and modals

ConsoleShortcuts exposes helpers for interacting with webpack, most notably:
- `wpsearch("some", "code")`: Search all webpack modules by keywords, returns record of matching module IDs and their source code
- `wreq.m[id].toString()` to read module source code
- `wreq(id)` to load the exports of a module
- `loadLazyChunks()` loads **all** lazy loaded modules. Use this sparingly, it downloads a significant amount of code.
- `getIntlMessageFromHash("hash")`: Retrieves a Discord intl message based on its hash
- `findByProps`, `findByCode`, `findComponentByCode`, `findStore`: Same as the `find*` methods in plugins
- `fakeRender(Component, props)`: Renders a component in a popup
- `canonicalizeMatch(regex)`: Converts `\i` and intl keys like patches do. Use it to test matches with `.test()` and `.replace()` against module source before building
- `wpPatcher.getFactoryPatchedSource(id)` and `wpPatcher.getFactoryPatchedBy(id)`: Patched source of a module and which plugins patched it. Dev builds only. `wreq.m[id].toString()` always returns the unpatched source

Run `shortcutList` for the full list.

Module IDs can change between Discord builds. Never hardcode them.
