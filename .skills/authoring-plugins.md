# Authoring Plugins

All public plugins go in `src/plugins`. Use `src/userplugins` for local private plugins.
Folder names can be suffixed to limit scope, e.g. `myPlugin.desktop`. Scopes are `web, browser, discordDesktop, vesktop, desktop, dev`

Look at existing plugins for examples. See the `PluginDef` interface for all available methods.

Plugins run in the renderer. Use the `native.ts` file for NodeJS code and exporting IPC methods

Read the plugin rules in `CONTRIBUTING.md` before adding a new plugin.

Plugins live in `index.ts`, or `index.tsx` if they use JSX, and start with the GPL license header.
`authors` must be an array of `Devs.Name`. Add new authors to `Devs` in `src/utils/constants.ts`
Define settings with `definePluginSettings` and read them via `settings.store.key`. Use the `flux` property to subscribe to Flux events.

## Writing patches

Plugins define patches to apply RegExp patches to Discord's javascript code.
Each patch defines:

* find: String or RegExp used to find the Webpack module to patch
* match: RegExp or string to match code. Can use `\i` to match javascript identifiers
* replace: String or function to replace the matched code with. Can use matches like `$1`, `$&`, etc and refer to the plugin object via `$self`. `$self` resolves via the plugin `name`, not the folder name.

A patch can have an array of replacements. Other options: `all` (patch every matching module), `fromBuild`/`toBuild` (limit to Discord build numbers), `group` (only apply if all replacements succeed), `noWarn`.

Never rely on minified identifiers or minifier output like `?void 0:` in patches, only rely on stable un-minified patterns like method/property names, intl keys (`#{intl::KEY}`) and unique string literals.

Finds must uniquely match only the module you want to match. Confirm with `wpsearch("pattern")`.
The same string often exists in multiple modules and the first match wins, which may be the wrong one.
Finds should contain one stable pattern and may use surrounding context to ensure uniqueness, e.g. `/foo:.{0,50}bar/`.

Matches should contain at least one specific anchor near the code to patch. Use `\i` and `.{0,n}?` to match minified code. Do this sparingly. Never use `[\w$]+`, `[A-Za-z]+` or `.*`.
Make patches specific enough that they don't accidentally match unrelated code, but not so specific that they break easily to minor changes in minified code.
Use look-arounds to avoid matching more code than you replace. Use capture groups to reuse minified identifiers in the replacement.

Replacements should be as concise as possible. Create a method on the plugin object and call it with `$self.methodName(...)` instead of inlining complex code.

`predicate()` runs once at startup, so use it for settings checks. For runtime conditions, check them in a `$self` method instead.

Failed patches don't throw, they log `Patch by <plugin> had no effect`. Check the console after building.

## Discord Modules

Vencord exports many Discord modules from `@webpack/commons`. Use `find*` methods when no common exists. Discord organises all data into stores. Find them with `findStore("Name")`.
Subscribe to store changes with `useStateFromStores`.

## Error Safety

Patch code is directly inlined into Discord and can easily crash the client.

All patch callbacks that can throw errors must use try-catch blocks to prevent crashing the client. Any callback that uses webpack modules can always throw.

All components must be wrapped in an ErrorBoundary, via `ErrorBoundary.wrap(props => <Component {...props} />, { noop: boolean })`.
wrap returns a wrapper that can safely be called as plain function in patches, e.g. `$self.renderThing(props)`. `noop: false` makes it render an error component instead of nothing.
Use this only for important components where end users seeing an error card is preferable to nothing being rendered.
