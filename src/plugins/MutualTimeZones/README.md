# MutualTimeZones

Shows a local time badge next to usernames in profile popouts, making it easy to know what time it is for someone at a glance.

## How it works

- **Your own timezone** is auto-detected from your system — no setup needed
- **Other users** must be set manually by right-clicking their name

## Setting a timezone

1. Right-click any user's name in chat or a server
2. Hover over **🕐 Set Timezone**
3. Pick their timezone from the list
4. Their local time will now show next to their username on your client

To remove a timezone, right-click the user again and select **✖ Clear Timezone**.

## The badge

The badge appears next to the username in profile popouts and shows:
- A time-of-day emoji (🌅 morning · ☀️ afternoon · 🌆 evening · 🌙 night)
- Their current local time
- Hovering shows the UTC offset and how many hours ahead/behind they are from you

## Settings

| Setting | Description | Default |
|---|---|---|
| Show Time Difference | Show how many hours ahead/behind the user is from you | On |
| Show Time of Day | Show the time-of-day emoji | On |

## Notes

- Timezone data is stored locally on your client only
- No external APIs are used
- Other users will not see any changes on their end
