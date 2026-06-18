# ChannelMessageCount

A plugin for showing the total number of messages in server channels.

- Counts are fetched lazily for channels as they appear in the channel list and are cached to avoid Discord rate limits
- Regular channels use Discord's message search results and threads use Discord's builtin message count when available
- Failed fetches are retried after a configurable delay

![](https://github.com/user-attachments/assets/4e8b247f-ca0e-49ef-86b6-8503f60aeaab)
