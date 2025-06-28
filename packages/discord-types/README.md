# Discord Types

This package provides TypeScript types for the Webpack modules of Discord's web app.

While it was primarily created for Vencord, other client mods could also benefit from this, so it is published as a standalone package!

## Installation

```bash
npm install -D @vencord/discord-types
yarn add -D @vencord/discord-types
pnpm add -D @vencord/discord-types
```

## Usage

```ts
import type { UserStore } from "@vencord/discord-types";

const userStore: UserStore = findStore("UserStore");
```

### License

This package is licensed under the [LGPL-3.0](./LICENSE) (or later) license.

A very short summary of the license is that you can use this package as a library in both open source and closed source projects,
similar to an MIT-licensed project.
However, if you modify the code of this package, you must release source code of your modified version under the same license.

### Credit

This package was inspired by Swishilicous' [discord-types](https://www.npmjs.com/package/discord-types) package.
