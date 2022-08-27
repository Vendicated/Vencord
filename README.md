# Vencord

A terrible Discord Desktop mod, because yes.

For installation, use [install.sh](install.sh) or read the comment in it for
info how to install on other platforms.

Currently, the only features are QuickCss and Experiments.

It differs from all other Discord mods in that it supports patching
Discord bundles inline, as in you can manipulate Discord's chunks before they
are loaded. This leads to more complex but way more powerful patches (You can
access local variables and override constants, like isDeveloper which Discord makes hard to modify but modifying it is piss easy with inline patching, see [patches/experiments.js](patches/experiments.js))

It of course also comes with a Webpack fetcher to do regular monkeypatches.
You can check out the patches folder for some examples of both kind of patches.

QuickCss has no Settings Ui, just manually edit the quickCss file (%appdata%/Vencord, ~/.config/Vencord, MacOs idk cope), it is automagically reloaded on modify.

## Disclaimer

I have no idea how electron works so this mod is probably very hacky and bad.
