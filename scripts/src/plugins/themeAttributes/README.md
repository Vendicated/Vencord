# ThemeAttributes

This plugin adds data attributes and CSS variables to various elements inside Discord

This allows themes to more easily theme those elements or even do things that otherwise wouldn't be possible

## Available Attributes

### All Tab Bars (User Settings, Server Settings, etc)

`data-tab-id` contains the id of that tab

![image](https://github.com/Vendicated/Vencord/assets/45497981/1263b782-f673-4f09-820c-4cc366d062ad)

### Chat Messages

- `data-author-id` contains the id of the author
- `data-author-username` contains the username of the author
- `data-is-self` is a boolean indicating whether this is the current user's message

![image](https://github.com/Vendicated/Vencord/assets/45497981/34bd5053-3381-402f-82b2-9c812cc7e122)

## CSS Variables

### Avatars

`--avatar-url-<resolution>` contains a URL for the users avatar with the size attribute adjusted for the resolutions `128, 256, 512, 1024, 2048, 4096`.

![image](https://github.com/Vendicated/Vencord/assets/26598490/192ddac0-c827-472f-9933-fa99ff36f723)
