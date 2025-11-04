# MessageExpiry
Set your messages to expire automatically after a certain amount of time.

This only handles messages that you send on this specific client. If you suddenly close the client, message deletion is not guaranteed.

To delete the remaining messages, please use \`/flush_expired_messages\` and wait for the notification confirming they have been deleted. Use \`/pause_expiry\` to temporarily put expiration on hold. It has the same effects as toggling the Pause option below.

When disabling this plugin, all messages waiting to expire will be expired.

To determine whether a message will be deleted, the following priority is followed:
- Excluded channel ids
- DMs excluded
- Excluded guilds (servers)

For example, if you send a message in a DM while DMs are not excluded, it will be deleted. However, if you
specifically whitelist a channel inside your DMs, it will not attempt to delete it.

If you exclude a guild (server), no messages will be deleted in that server.

There also are commands available to easily add/remove a channel/guild to exclusion list.
