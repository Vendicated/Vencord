# CustomMessageTimestamps

This plugin allows you to customize the timestamps in chat messages and tooltips.

## Formats

- Cozy: The timestamp by your username when chat is in cozy mode.
![cozy](https://github.com/user-attachments/assets/a883b21b-346b-4e36-9660-771eff6898c9)


- Compact: The timestamp to the left of messages when chat is in compact mode and when you send multiple messages in cozy mode.
![compact](https://github.com/user-attachments/assets/9944495f-ff21-4da5-b6f2-0ee0e0a7bf99)


- Tooltip: The timestamp in the tooltip when hovering over a message.
![tootip](https://github.com/user-attachments/assets/5fcc6c0e-ad52-4a4e-8660-b373f5020d11)

## Placeholders

- **[calendar]**: Replaced with moment.js's calendar time, which dynamically adjusts based on the date.
- **[relative]**: Replaced with moment.js's relative time, such as "4 hours ago".

## Timeframes for Calendar Time

- **Same day**: Format for today's dates (e.g., "Today, 2:30 PM").
- **Last day**: Format for yesterday's dates (e.g., "Yesterday, 2:30 PM").
- **Last week**: Format for dates within the last week (e.g., "Monday, 2:30 PM").
- **Older date**: Format for older dates (e.g., "01/01/2024, 2:30 PM").

For more information on formatting options, refer to the [Moment.js formatting documentation](https://momentjs.com/docs/#/displaying/format/).
