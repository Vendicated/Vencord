# Remove Shortcuts Plugin
This plugin disallows certain keyboard shortcuts from reaching discord.
It is useful for preventing accidental triggering of shortcuts that may annoy you, and can't be disabled by default (CTRL + Slash, CTRL + ', etc).
By default it blocks the `CTRL + '` and `CTRL + SHIFT + '` shortcut, but you can customize the blocked shortcuts in the settings.
For example, to block CTRL + /, add `ctrl+Slash` to the list of blocked shortcuts, to add more seperate them by the pipe character `|` like so: `ctrl+Slash|ctrl+Quote|ctrl+Comma`.

#### Why direct DOM manipulation?
Discord has a very annoying system for shortcuts, which isn't centralized. So for example the `ctrl + /` shortcut is handled in a completely different way than the `ctrl + '` shortcut.
This makes it impossible to block all shortcuts elegantly, and as this is only a keydown event listener, it should not cause any issues.

-[Kim](https://github.com/MartinPrograms)
