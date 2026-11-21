# StaffBadges

Shows a staff tag next to server members' names in messages and the member list, using Discord's native APP tag style.

The tag appears after the role icon and before PlatformIndicators. Messages and the member list can be enabled separately in the plugin settings.

## Permission detection

The plugin combines the permissions of every role assigned to a member, including @everyone. Role names do not affect the tag: a Developer role granting Administrator displays ADMIN.

Only the highest matching tag is shown, in this order:

| Tag | Requirement |
| --- | --- |
| OWNER | The actual server owner |
| ADMIN | Administrator |
| MOD | Kick Members, Ban Members, Manage Messages or Moderate Members |
| VC MOD | Move Members, Mute Members or Deafen Members |

Tags describe server-level permissions, not channel-specific permission overwrites or whether a member can moderate a particular target. Members without one of these permissions have no tag. Bots keep their normal APP tag, and direct messages do not show staff tags.

The plugin uses members and roles already loaded by Discord and updates when those stores change. It makes no network requests and does not grant permissions or publish tags to other users.
