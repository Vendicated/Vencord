# Vencord

A Discord client mod that does things differently

## Features

-   Works on Discord's latest update that breaks all other mods
-   Browser Support (experimental): Run Vencord in your Browser instead of the desktop app
-   Custom Css and Themes: Manually edit `%appdata%/Vencord/settings/quickCss.css` / `~/.config/Vencord/settings/quickCss.css` with your favourite editor and the client will automatically apply your changes. To import BetterDiscord themes, just add `@import url(theUrl)` on the top of this file. (Make sure the url is a github raw URL or similar and only contains plain text, and NOT a nice looking website)
-   Many Useful™ plugins - [List](https://github.com/Vendicated/Vencord/tree/main/src/plugins)
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

## License

Most code in this repo is licensed under the [GPL-3.0](LICENSE). Only third party dependencies and user created content in src/plugins may be subject to a different License.
If that is the case, it will be denoted by either a License header in the file or a LICENSE file in the content's directory.

Any other source code is subject to the GPL-3.0 as stated above. To incorporate it into a different project, please prepend the following header and include
the GPL-3.0 as found in [LICENSE](LICENSE)
```
/*
 * This file is part of Vencord (https://github.com/Vendicated/Vencord)
 * Copyright (C) 2022 Vendicated and Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
 ```

 #### For contributors

 For contributors wanting to submit a plugin, as stated above you may license your plugin under your own License as long as it satisfies the following Conditions:
 - It is an open source license approved by either the [OSI](https://opensource.org/licenses/alphabetical) or the [FSF](https://www.gnu.org/licenses/license-list.html)
 - It is GPL-3.0-compatible
