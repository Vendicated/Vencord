# AutoThemeSwitcher

A plugin for [Vencord, a Discord client mod](https://vencord.dev) that automatically switches between 2 themes based on the time of day. Useful for people that would like to set up a "light theme at day, dark theme at night" schedule.

![Screenshot of plugin settings](https://maddie480.ovh/static/img/auto-theme-switcher.png)

## Installing the plugin

Please refer to [the Vencord docs](https://docs.vencord.dev/installing/custom-plugins/) for instructions on installing and updating userplugins.

## Start Times

The default schedule is:
- Light theme starts at 08:00
- Dark theme starts at 20:00

This means the light theme will be applied from 08:00 to 20:00, and the dark theme from 20:00 to 08:00.

## Theme Configurations

The dropdown allows you to pick the base "Light" and "Dark" themes, and all of the Nitro themes. **Using Nitro themes requires Nitro, or activating the FakeNitro plugin.**

Additionally, you can specify CSS theme URLs. If you fill those fields, this will **replace** your "Online Themes" settings when the theme is toggled. The choice of Light or Dark theme will still have an effect.
