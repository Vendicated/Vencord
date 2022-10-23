# Vencord

A Discord client mod that does things differently

## Features

-   Works on Discord's latest update that breaks all other mods
-   Browser Support (experimental): Run Vencord in your Browser instead of the desktop app
-   Custom Css and Themes: Manually edit `%appdata%/Vencord/settings/quickCss.css` / `~/.config/Vencord/settings/quickCss.css` with your favourite editor and the client will automatically apply your changes. To import BetterDiscord themes, just add `@import url(theUrl)` on the top of this file. (Make sure the url is a github raw URL or similar and only contains plain text, and NOT a nice looking website)
-   Many Useful™ plugins - [List](plugins.md)
-   Experiments
-   Proper context isolation -> Works in newer Electron versions (Confirmed working on versions 13-22)
-   Inline patches: Patch Discord's code with regex replacements! See [the experiments plugin](src/plugins/experiments.ts) for an example. While being more complex, this is more powerful than monkey patching since you can patch only small parts of functions instead of fully replacing them, access non exported/local variables and even replace constants (like in the aforementioned experiments patch!)

## Installing / Uninstalling

Read [Megu's Installation Guide!](docs/1_INSTALLING.md)

## Installing on Browser

Run the same commands as in the regular install method. Now run

```sh
pnpm buildWeb
```

You will find the built extension at dist/extension.zip. Now just install this extension in your Browser

## Installing Plugins

Vencord comes with a bunch of plugins out of the box!
However, if you want to install your own ones, create a `userplugins` folder in the `src` directory and create or clone your plugins in there.
Don't forget to rebuild!

Want to learn how to create your own plugin, and maybe PR it into Vencord? See the [Contributing](#contributing) section below!

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [Megu's Plugin Guide!](docs/2_PLUGINS.md)

[contribute]: CONTRIBUTING.md

[contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute] [contribute]

## Join

[join]: https://discord.gg/D9uwnFnqmd

[join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join] [join]
