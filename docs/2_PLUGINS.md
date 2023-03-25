# Plugins Guide

Welcome to Megu's Plugin Guide! In this file, you will learn about how to write your own plugin!

You don't need to run `pnpm build` every time you make a change. Instead, use `pnpm watch` - this will auto-compile Vencord whenever you make a change. If using code patches (recommended), you will need to CTRL+R to load the changes.

## Plugin Entrypoint

> If it doesn't already exist, create a folder called `userplugins` in the `src` directory of this repo.

1. Create a folder in `src/userplugins/` with the name of your plugin. For example, `src/userplugins/epicPlugin/` - All of your plugin files will go here.

2. Create a file in that folder called `index.ts`

3. In `index.ts`, copy-paste the following template code:

```ts
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Epic Plugin",
    description: "This plugin is absolutely epic",
    authors: [
        {
            id: 12345n,
            name: "Your Name",
        },
    ],
    // Delete `patches` if you are not using code patches, as it will make
    // your plugin require restarts, and your stop() method will not be
    // invoked at all.  The presence of the key in the object alone is
    // enough to trigger this behavior, even if the value is an empty array.
    patches: [],
    // Delete these two below if you are only using code patches
    start() {},
    stop() {},
});
```

Change the name, description, and authors to your own information.

Replace `12345n` with your user ID ending in `n` (e.g., `545581357812678656n`). If you don't want to share your Discord account, use `0n` instead!

## How Plugins Work In Vencord

Vencord uses a different way of making mods than you're used to.
Instead of monkeypatching webpack, we directly modify the code before Discord loads it.

This is _significantly_ more efficient than monkeypatching webpack, and is surprisingly easy, but it may be confusing at first.

## Making your patch

For an in-depth guide into patching code, see [CONTRIBUTING.md](../CONTRIBUTING.md)

in the `index.ts` file we made earlier, you'll see a `patches` array.

> You'll see examples of how patches are used in all the existing plugins, and it'll be easier to understand by looking at those examples, so do that first, and then return here!

> For a good example of a plugin using code patches AND runtime patching, check `src/plugins/unindent.ts`, which uses code patches to run custom runtime code.

One of the patches in the `isStaff` plugin, looks like this:

```ts
{
    match: /(\w+)\.isStaff=function\(\){return\s*!1};/,
    replace: "$1.isStaff=function(){return true};",
},
```

The above regex matches the string in discord that will look something like:

```js
abc.isStaff = function () {
    return !1;
};
```

Remember that Discord code is minified, so there won't be any newlines, and there will only be spaces where necessary. So the source code looks something like:

```
abc.isStaff=function(){return!1;}
```

You can find these snippets by opening the devtools (`ctrl+shift+i`) and pressing `ctrl+shift+f`, searching for what you're looking to modify in there, and beautifying the file to make it more readable.

In the `match` regex in the example shown above, you'll notice at the start there is a `(\w+)`.
Anything in the brackets will be accessible in the `replace` string using `$<number>`. e.g., the first pair of brackets will be `$1`, the second will be `$2`, etc.

The replacement string we used is:

```
"$1.isStaff=function(){return true;};"
```

Which, using the above example, would replace the code with:

> **Note**
> In this example, `$1` becomes `abc`

```js
abc.isStaff = function () {
    return true;
};
```

The match value _can_ be a string, rather than regex, however usually regex will be better suited, as it can work with unknown values, whereas strings must be exact matches.

Once you've made your plugin, make sure you run `pnpm test` and make sure your code is nice and clean!

If you want to publish your plugin into the Vencord repo, move your plugin from `src/userplugins` into the `src/plugins` folder and open a PR!

> **Warning**
> Make sure you've read [CONTRIBUTING.md](../CONTRIBUTING.md) before opening a PR

If you need more help, ask in the support channel in our [Discord Server](https://discord.gg/D9uwnFnqmd).
