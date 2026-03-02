# Equicord Development Guidelines

## Critical Rules

- **NEVER** edit existing license headers. New files use 2026.
- Push back when the user idea is wrong or not correct.
- **NEVER** git checkout files without explicit permission.
- Always verify components/functions arent deprecated before using.
- **NEVER** use `any` for Discord objects. Import proper types from `@vencord/discord-types`.
- Fix with smallest possible change. No refactoring unless explicitly asked.
- Solve the problem at hand only. No patterns for patterns sake.
- **NEVER** overengineer. No premature abstractions, no helpers for one-time operations, no building for hypothetical futures. Three similar lines is better than a premature abstraction.
- Write modern, robust, professional code. Use current language features, proper error handling, and clean structure.
- Write natural human text in errors, descriptions, messages. No dashes or robotic formatting. Write like "Module not found" not "Module - not found". Keep it simple and conversational.

## Code Rules

- **DELETE** dead code, dont comment it. Git preserves history.
- No hardcoded values, unused imports, magic numbers.
- Import `classNameFactory` from `@utils/css` (NOT `@api/Styles` which is deprecated). **ALWAYS** use `cl()` for class names, never hardcode strings like `"vc-plugin-name-class"`.
- When combining multiple class names use `classes()` from `@utils/misc`, not template strings like `` `${a} ${b}` ``.
- Use utilities from `@utils/`, `@api/`, `@components/`.
- Use `Logger` from `@utils/Logger`, not `console.log`.
- Descriptions: capital first letter, end with period.
- Less code with same functionality is **ALWAYS** better. If it can be done in fewer lines without losing clarity, do it.
- Keep logic flat. Avoid deep nesting, prefer early returns, guard clauses, and simple control flow.
- **NEVER** add comments unless explicitly asked.
- Keep existing comments, they contain important context.
- Use `Map`/`Set`, `.some`/`.find`, no spread in loops, `Promise.all`.
- KISS over clever, flat over nested, explicit over implicit.

## TypeScript

- **Prefer:** optional chaining (`?.`), nullish coalescing (`??`), `const`, arrow functions
- **Use:** destructuring, template literals, object shorthand, array methods
- **Style:** early returns, trust inference, inline single-use variables

## React

- Wrap complex components with `ErrorBoundary.wrap(Component, { noop: true })`.
- Return `null` for conditional rendering, not `undefined`.
- **Forbidden:** `React.cloneElement`, `React.isValidElement`, `React.memo()`, `React.lazy`, `React.Children`
- Always return cleanup functions in `useEffect`.

## Forbidden

### Code

- **No raw DOM manipulation.** No `document.querySelector`, no `MutationObserver`, no `element.style`. Always use webpack patches and React.
- Empty catch blocks.
- Hardcoded minified vars in patches (`e,t,n`).
- **NEVER** use `settings.use()` with arrays. Mutate then reassign.

### Plugins

- **No selfbot or API abuse.** Nothing that automates user actions, spoofs client state, or abuses Discord's API in any way.
- No plugins that only do something trivially achievable with existing built-in plugins or Discord features.
- No CSS-only plugins that only hide or redesign UI elements.
- No plugins targeting specific third-party bots (official Discord apps are fine).
- No untrusted third-party APIs. No plugins requiring users to supply their own API keys.
- Do not introduce new dependencies unless strictly necessary and well justified.

## Anti-Patterns

- `value !== null && value !== undefined` ⟹ `value != null`
- `array && array.length > 0` ⟹ `array.length` (only when array is guaranteed to exist)
- `settings?.store?.value` ⟹ `settings.store.value`
- `value || defaultValue` ⟹ `value ?? defaultValue`

## Patching

### Core Principles

- Minimum code touched. Stability over cleverness. One patch per concern.
- Try multiple approaches, keep simplifying until you find the cleanest solution.
- Remove any regex character that doesnt change the match result.
- Not overengineered, not overlooked, just clean and future-proof.

### Find Strings

- Use `#{intl::KEY}` in find when possible, most stable anchor.
- If find matches multiple modules, add nearby stable string like `"),icon:"` or function name.
- `"#{intl::PIN_MESSAGE}),icon:"` is better than generic strings.

### Match Patterns

- Match only what you need to replace, let find do the targeting.
- Can use `#{intl::KEY}` in match too, gets canonicalized to hash.
- `/#{intl::KEY}\)/` beats `/label:\i\.pinned\?.{0,60}#{intl::KEY}\)/`
- `$&` keeps original, append/prepend to it.
- Use bounded gaps: `.{0,50}` not `.+?` or `.*?`
- Only use capture groups if reusing in replace.

### NEVER Do

- **Hardcoded minified vars:** `e,t,n,r,i,o,s,l,c,u,$_,xx,eD,eH,eW` — use `\i` instead
- **Minified chains:** `\i\.\i` alone — surround with stable strings
- **Unbounded gaps:** `.+?` or `.*?` — use `.{0,N}`
- **Generic patterns:** `/className:\i/` alone — add anchor
- **Raw intl hashes:** `.aA4Vce` — use `#{intl::KEY_NAME}`

### Patch Examples

**Clean replacement:**

```js
find: "#{intl::PIN_MESSAGE}),icon:"
match: /#{intl::PIN_MESSAGE}\)/
replace: "$self.getPinLabel(arguments[0]))"
```

**Appending:**

```js
find: "#{intl::VIEW_AS_ROLES_MENTIONS_WARNING}"
match: /#{intl::VIEW_AS_ROLES_MENTIONS_WARNING}.{0,100}(?=])/
replace: "$&,$self.renderTooltip(arguments[0].guild)"
```

**Wrapping:**

```js
find: "#{intl::SEVERAL_USERS_TYPING_STRONG}"
match: /(?<="aria-atomic":!0,children:)\i/
replace: "$self.renderTypingUsers({ children: $& })"
```

## Plugin Interop

- `isPluginEnabled(name)` from `@api/PluginManager` takes a string, checks required/isDependency/enabled.
- Import the plugin directly from its path to access `.name` and functions.
- Dont use `Vencord.Plugins.plugins` or `plugin.started`. Dont use `"as unknown as"` casting.

```ts
import { isPluginEnabled } from "@api/PluginManager";
import otherPlugin from "@equicordplugins/otherPlugin";
if (!isPluginEnabled(otherPlugin.name)) return null;
otherPlugin.someFunction();
```

## Reference

### Types

`Channel`, `Guild`, `GuildMember`, `User`, `Role`, `Message` from `@vencord/discord-types`

### Components

`Paragraph`, `BaseText`, `Flex`, `Button`, `ErrorCard` from `@components/`

### Settings

Use `definePluginSettings` from `@api/Settings`, not inline settings object.

### Utilities

- **@utils/clipboard** — `copyToClipboard`
- **@utils/discord** — `insertTextIntoChatInputBox`, `getCurrentChannel`, `getCurrentGuild`, `getIntlMessage`, `openUserProfile`, `openPrivateChannel`, `sendMessage`, `copyWithToast`, `getUniqueUsername`, `fetchUserProfile`
- **@utils/css** — `classNameFactory`, `classNameToSelector`
- **@utils/misc** — `classes`, `sleep`, `isObject`, `isObjectEmpty`, `pluralise`, `parseUrl`, `identity`
- **@utils/text** — `formatDuration`, `formatDurationMs`, `humanFriendlyJoin`, `makeCodeblock`, `toInlineCode`, `escapeRegExp`
- **@utils/modal** — `openModal`, `closeModal`, `ModalRoot`, `ModalHeader`, `ModalContent`, `ModalCloseButton`
- **@utils/margins** — `Margins` (`Margins.top8`, `Margins.bottom16`, etc.)
- **@utils/guards** — `isTruthy`, `isNonNullish`
- **@utils/web** — `saveFile`, `chooseFile`

### Webpack Common

#### IconUtils

From `@webpack/common`. **NEVER** hardcode `cdn.discordapp.com` URLs.

- `IconUtils.getUserAvatarURL(user, canAnimate?, size?)`
- `IconUtils.getDefaultAvatarURL(id)`
- `IconUtils.getUserBannerURL({ id, banner, canAnimate?, size })`
- `IconUtils.getGuildIconURL({ id, icon, size?, canAnimate? })`
- `IconUtils.getGuildBannerURL(guild, canAnimate?)`
- `IconUtils.getChannelIconURL({ id, icon })`
- `IconUtils.getEmojiURL({ id, animated, size })`
- `IconUtils.getApplicationIconURL(data)`
- `IconUtils.getGameAssetURL(data)`

#### Stores

`UserStore`, `GuildStore`, `ChannelStore`, `GuildMemberStore`, `SelectedChannelStore`, `SelectedGuildStore`, `PresenceStore`, `RelationshipStore`, `MessageStore`, `EmojiStore`, `ThemeStore`, `PermissionStore`, `VoiceStateStore` from `@webpack/common`

#### Actions

`RestAPI`, `FluxDispatcher`, `MessageActions`, `NavigationRouter`, `ChannelRouter`, `ChannelActionCreators`, `SettingsRouter` from `@webpack/common`

#### Utils

`Constants` (`Constants.Endpoints`), `SnowflakeUtils`, `Parser`, `PermissionsBits`, `moment`, `lodash`, `ColorUtils`, `ImageUtils`, `DateUtils`, `UsernameUtils`, `DisplayProfileUtils`, `URLUtils`, `Humanize`, `EmojiUtils` from `@webpack/common`

#### Components

`Tooltip`, `TextInput`, `TextArea`, `Select`, `Slider`, `Avatar`, `Menu`, `Popout`, `ScrollerThin`, `Timestamp` from `@webpack/common`

#### Toasts

`Toasts`, `showToast` from `@webpack/common`

### Imports

- **Lazy** from `@webpack` — `findByPropsLazy`, `findStoreLazy`, `findComponentByCodeLazy`, `findExportedComponentLazy`
- **Common** from `@webpack/common` — `useState`, `useEffect`, `useCallback`, `useStateFromStores`

### Never Hardcode

- `"cdn.discordapp.com/avatars/"` etc. ⟹ `IconUtils`
- `"/api/v9"`, `"/users/@me"` ⟹ `Constants.Endpoints` or `RestAPI`
- `console.log/warn/error` ⟹ `Logger` from `@utils/Logger`
- `` `${a} ${b}` `` for class names ⟹ `classes(a, b)` from `@utils/misc`
