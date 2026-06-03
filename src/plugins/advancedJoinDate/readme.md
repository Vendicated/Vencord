# AdvancedJoinDate

Shows the exact join date and time on user popouts, sidebars and full profiles. Way more useful than what Discord shows by default.

## Screenshots

![Server popup](screenshots/popup.png)

## Features

- shows the exact date and time a user joined a server, with the server icon next to it
- shows account creation date calculated from the Discord snowflake ID
- hover over any date to see how long ago it was (e.g. "3 years, 47 days, 12 hours, 50 minutes")
- works in user popups, DM sidebar, and full profile modals
- if a guild has no icon, shows initials instead (just like Discord does)
- optional warning for accounts newer than a configurable threshold
- all formatting respects the user's locale and 12h/24h preference automatically

## Notes

The server join date is only available when you have access to the member data for that guild. In DMs or when the member data hasn't loaded yet, only the account creation date (from the snowflake) is shown.

The relative time on hover strips the "ago" suffix since it combines multiple units, so instead of "3 years ago, 47 days ago" you get a clean "3 years, 47 days, 12 hours, 50 minutes".
