# UserTimeZones (Vencord userplugin)

Lets you save a **GMT/UTC offset** for any user (like `GMT+2`), and shows what time it is for them.

## What it shows

- Format: `h:mm AM/PM <day>`
- Example: `1:05 PM tue`

(Uses your system locale for time formatting, but forces 12-hour time.)

## How to use

### Via user context menu

Right-click a user:
- **Set Timezone (GMT)** → pick from the dropdown list
- **Clear Timezone**

Once you set it, their time shows in:
- Member list / DM list
- User profile areas (popout/modal/sidebar profile)

### Via slash commands

- `/usertime user:@someone`

## Notes

- Offsets are stored as GMT-style offsets (ex: `GMT-5`, `GMT`, `GMT+2`).
