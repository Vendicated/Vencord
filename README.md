# Vencord

My own Discord Desktop mod :)

## Features

- Proper context isolation -> Works in newer Electron versions
- Inline patches: Patch Discord's code with regex replacements! See [the experiments plugin](src/plugins/experiments.ts) for an example. While being more complex, this is more powerful than monkey patching since you can patch only small parts of functions instead of fully replacing them, access non exported/local variables and even replace constants (like in the aforementioned experiments patch!)
- Custom Css: Manually edit `%appdata%/Vencord/settings/quickCss.css` / `~/.config/Vencord/settings/quickCss.css` with your favourite editor and the client will automatically apply your changes
