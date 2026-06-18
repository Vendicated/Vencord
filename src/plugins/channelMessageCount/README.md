# ChannelMessageCount

Shows message counts in server channels.

Counts are fetched lazily for channels as they appear in the channel list and are cached to avoid repeatedly querying Discord. Regular channels use Discord's message search results, while threads use their built-in message count when available.

## Notes

- Counts may not appear instantly for every channel in a server.
- Counts may be temporarily unavailable while Discord search is indexing.
- Counts can be refreshed and failed fetches retried using the plugin settings.

![](https://github.com/user-attachments/assets/4e8b247f-ca0e-49ef-86b6-8503f60aeaab)