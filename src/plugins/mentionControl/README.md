# MentionControl

Mute incoming everyone/here mentions, direct mentions, direct messages, replies to you, and mentions of your roles independently. Direct Messages includes ordinary one-to-one and group DMs; requests, spam, system messages, and unresolved safety contexts keep Discord's behavior.

A muted new message has its local sound and desktop popup suppressed and is marked read through Discord's native acknowledgement route. Reading it also reads earlier messages in that channel, including other mention types, and can synchronize to your other devices. Old history is not scanned. If a later allowed message arrives before acknowledgement, the read is cancelled; a badge can remain. Native refusal or failed synchronization can also preserve or restore badges.

Every option starts off for a new account. Pause preserves your selections, and Reset this account restores that account's defaults. Each option applies to subsequent messages. Enabling or disabling the plugin requires a reload. A message with an independently allowed applicable mention type remains native.

The current adapter targets Discord Stable build 649389, hash `a4e81a1fff2ccc1e9c47281017039f16f16b2664`. Other builds retain native behavior. Mobile push and unrelated notifications are outside scope; there is no universal badge-hiding override.

For development, run the behavioral tests from the Vencord checkout:

```sh
pnpm exec tsx --test src/plugins/mentionControl/tests/*.test.ts
```

`pnpm test` checks the build, TypeScript, lint, CSS, and plugin metadata; it does not run that behavioral suite. The author reports that the installed custom version works, but no complete per-category live notification/read-state matrix or PTB/Canary test is claimed.
