# Contribution Guide

First of all, thank you for contributing! :3

To ensure your contribution is robust, please follow the below guide!

For a friendly introduction to plugins, see [Megu's Plugin Guide!](docs/2_PLUGINS.md)

## Style Guide

-   This project has a very minimal .editorconfig. Make sure your editor supports this!
    If you are using VSCode, it should automatically recommend you the extension; If not,
    please install the Editorconfig extension
-   Try to follow the formatting in the rest of the project and stay consistent
-   Follow the file naming convention. File names should usually be camelCase, unless they export a Class
    or React Component, in which case they should be PascalCase

## Contributing a Plugin

Because plugins modify code directly, incompatibilities are a problem.

Thus, 3rd party plugins are not supported, instead all plugins are part of Equicord itself.
This way we can ensure compatibility and high quality patches.

Follow the below guide to make your first plugin!

### Finding the right module to patch

If the thing you want to patch is an action performed when interacting with a part of the UI, use React DevTools.
They come preinstalled and can be found as the "Components" tab in DevTools.
Use the Selector (top left) to select the UI Element. Now you can see all callbacks, props or jump to the source
directly.

If it is anything else, or you're too lazy to use React DevTools, hit `CTRL + Shift + F` while in DevTools and
enter a search term, for example "getUser" to search all source files.
Look at the results until you find something promising. Set a breakpoint and trigger the execution of that part of Code to inspect arguments, locals, etc...

### Writing a robust patch

##### "find"

First you need to find a good `find` value. This should be a string that is unique to your module.
If you want to patch the `getUser` function, usually a good first try is `getUser:` or `function getUser()`,
depending on how the module is structured. Again, make sure this string is unique to your module and is not
found in any other module. To verify this, search for it in all bundles (CTRL + Shift + F)

##### "match"

This is the regex that will operate on the module found with "find". Just like in find, you should make sure
this only matches exactly the part you want to patch and no other parts in the file.

The easiest way to write and test your regex is the following:

-   Get the ID of the module you want to patch. To do this, go to it in the sources tab and scroll up until you
    see something like `447887: (e,t,n)=>{` (Obviously the number will differ).
-   Now paste the following into the console: `Vencord.Webpack.wreq.m[447887].toString()` (Changing the number to your ID)
-   Now either test regexes on this string in the console or use a tool like https://regex101.com

Also pay attention to the following:

-   Never hardcode variable or parameter names or any other minified names. They will change in the future. The only Exception to this rule
    are the react props parameter which seems to always be `e`, but even then only rely on this if it is necessary.
    Instead, use one of the following approaches where applicable:
    -   Match 1 or 2 of any character: `.{1,2}`, for example to match the variable name in `var a=b`, `var (.{1,2})=`
    -   Match any but a guaranteed terminating character: `[^;]+`, for example to match the entire assigned value in `var a=b||c||func();`,
        `var .{1,2}=([^;]+);`
    -   If you don't care about that part, just match a bunch of chars: `.{0,50}`, for example to extract the variable "b" in `createElement("div",{a:"foo",c:"bar"},b)`, `createElement\("div".{0,30},(.{1,2})\),`. Note the `.{0,30}`, this is essentially the same as `.+`, but safer as you can't end up accidently eating thousands of characters
-   Additionally, as you might have noticed, all of the above approaches use regex groups (`(...)`) to capture the variable name. You can then use those groups in your replacement to access those variables dynamically

#### "replace"

This is the replacement for the match. This is the second argument to [String.replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace), so refer to those docs for info.

Never hardcode minified variable or parameter names here. Instead, use capture groups in your regex to capture the variable names
and use those in your replacement

Make sure your replacement does not introduce any whitespace. While this might seem weird, random whitespace may mess up other patches.
This includes spaces, tabs and especially newlines

---

And that's it! Now open a Pull Request with your Plugin
