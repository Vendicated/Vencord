# XDG Global Keybinds

Enables global keybinds on linux for Vencord and Vesktop. This is espically useful for Vesktop users who want to use global keybinds and/or Hyprland users.

## Available Keybinds

Currently, the following keybinds are available:

- toggle_mute
- toggle_deafen

## Hyprland Configuration

To use these keybinds in Hyprland, you can add the following to your Hyprland configuration file:

```ini
bind = SUPERSHIFT, A, global, :toggle_mute
bind = SUPERSHIFT, D, global, :toggle_deafen
```

For more, refer to the [Hyprland wiki](https://wiki.hypr.land/Configuring/Binds/#dbus-global-shortcuts).
