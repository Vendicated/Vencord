# Authoring Plugins

All public plugins go in `src/plugins`. Use `src/userplugins` for local private plugins.
Folder names can be suffixed to limit scope, e.g. `myPlugin.desktop`. Scopes are `web, browser, discordDesktop, vesktop, desktop, dev`

Look at existing plugins for examples. See the `PluginDef` interface for all available methods.

Plugins run in the renderer. Use the `native.ts` file for NodeJS code and exporting IPC methods

## Writing patches

Plugins define patches to apply RegExp patches to Discord's javascript code.
Each patch defines:
- find: Used to find the Webpack module to patch
- match: RegExp or string to match code. Can use `\i` to match javascript identifiers
- replace: String to replace the matched code with. Can use matches like `$1`, `$&`, etc and refer to the plugin object via `$self`.

Never rely on minified identifiers in patches, only rely on stable un-minified patterns like method/property names and intl hashes.

Finds must uniquely match only the module you want to match. Confirm with `wpsearch("pattern")`.
Finds should contain one stable pattern and may use surrounding context to ensure uniqueness.

Matches should contain at least one specific anchor near the code to patch. Use `\i` and `.{0,n}?` to match minified code. Do this sparingly.
Make patches specific enough that they don't accidentally match unrelated code, but not so specific that they break easily to minor changes in minified code.
Use modern RegExp features like look-arounds.

Replacements should be as concise as possible. Create a method on the plugin object and call it with `$self.methodName(...)` instead of inlining complex code.

## Discord Modules

Vencord exports many Discord modules from `@webpack/commons`. Use `find*` methods when no common exists. Discord organises all data into stores, `window.Stores` contains all of them.
Subscribe to store changes with `useStateFromStores`.

## Error Safety

Patch code is directly inlined into Discord and can easily crash the client.

All patch callbacks that can throw errors must use try-catch blocks to prevent crashing the client. Any callback that uses webpack modules can always throw.

All components must be wrapped in an ErrorBoundary, via `ErrorBoundary.wrap(props => <Component {...props} />, { noop: boolean })`.
wrap returns a wrapper that can safely be called as plain function in patches, e.g. `$self.renderThing(props)`. `noop: false` makes it render an error component instead of nothing.
Use this only for important components where end users seeing an error card is preferable to nothing being rendered.
