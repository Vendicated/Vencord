# Transcript

Export messages from any text channel, thread, DM or group DM with fine grain filters and multiple output formats.

## Highlights
- HTML, Markdown or JSON export with consistent metadata and ready-to-go filenames
- Discord-like rendering for avatars, nicknames, embeds, reactions and playable media
- Right click inside the transcript to copy user IDs, message IDs or deep links
- Date ranges support ISO strings (for example 2025-01-01T12:00) or relative expressions (
ow, -7d, +2h)
- From-start toggle gathers history from the first message up to a chosen date or the current moment
- Keyword, author, pinned and media-only filters to target exactly the messages you need

## Using the Plugin
1. Right click a channel, thread, DM or message and choose Export Transcript....
2. Adjust the channel target, output format, range and filters in the modal.
3. Press **Generate Transcript** to fetch messages and save the file.

### Channel selection
- The Channel or DM picker includes every text channel, thread and private conversation you can access.
- Launching from a message can anchor the export to that message automatically.

### Time range controls
- Enable **Start from the first message** to pull the entire history until the end date.
- Use **Up to now** for a live snapshot, or enter a custom end timestamp when you need a finite window.

### Output notes
- HTML exports inline all styling and scripts so avatars, embeds, videos, audio and copy menus work offline.
- Markdown exports use readable headings and bullet lists for attachments, embeds and reactions.
- JSON exports include channel metadata plus whichever fields you chose to include.

## Tips
- Large transcripts can take a moment to fetch. Progress updates appear in the modal while paging.
- The maximum batch size defaults to 500 messages but can be raised in plugin settings (up to 5000).
- If Discord rate limits the requests, wait a few seconds and try again with a narrower range.
