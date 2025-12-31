# showMeYourTime
A Vencord plugin to display a users local time next to their username

## Features
- Shows users' local time next to their username in messages
- Supports custom timezone settings for each user
- Configurable time format (12-hour or 24-hour)
- Optional seconds display
- Timezone settings stored in JSON format

## Configuration
You can configure the following settings:
- Timezones: Set custom timezones for users in JSON format (e.g. `{"123456789": "-08:00", "1234567890": "+05:30"}`)
- Time Format: Choose between 12-hour (e.g. 2:30 PM) or 24-hour (e.g. 14:30) format
- Show Seconds: Toggle whether to display seconds in the time

## ⚠️ Warning
**DO NOT** use this plugin together with the ShowMeYourName plugin as it will cause Discord to crash. These plugins are incompatible with each other.
