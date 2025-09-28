export const enum StickerType {
    /** an official sticker in a pack */
    STANDARD = 1,
    /** a sticker uploaded to a guild for the guild's members */
    GUILD = 2
}

export const enum StickerFormatType {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    GIF = 4
}

export const enum MessageType {
    /**
     * A default message (see below)
     *
     * Value: 0
     * Name: DEFAULT
     * Rendered Content: "{content}"
     * Deletable: true
     */
    DEFAULT = 0,
    /**
     * A message sent when a user is added to a group DM or thread
     *
     * Value: 1
     * Name: RECIPIENT_ADD
     * Rendered Content: "{author} added {mentions [0] } to the {group/thread}."
     * Deletable: false
     */
    RECIPIENT_ADD = 1,
    /**
     * A message sent when a user is removed from a group DM or thread
     *
     * Value: 2
     * Name: RECIPIENT_REMOVE
     * Rendered Content: "{author} removed {mentions [0] } from the {group/thread}."
     * Deletable: false
     */
    RECIPIENT_REMOVE = 2,
    /**
     * A message sent when a user creates a call in a private channel
     *
     * Value: 3
     * Name: CALL
     * Rendered Content: participated ? "{author} started a call{ended ? " that lasted {duration}" : " — Join the call"}." : "You missed a call from {author} that lasted {duration}."
     * Deletable: false
     */
    CALL = 3,
    /**
     * A message sent when a group DM or thread's name is changed
     *
     * Value: 4
     * Name: CHANNEL_NAME_CHANGE
     * Rendered Content: "{author} changed the {is_forum ? "post title" : "channel name"}: {content} "
     * Deletable: false
     */
    CHANNEL_NAME_CHANGE = 4,
    /**
     * A message sent when a group DM's icon is changed
     *
     * Value: 5
     * Name: CHANNEL_ICON_CHANGE
     * Rendered Content: "{author} changed the channel icon."
     * Deletable: false
     */
    CHANNEL_ICON_CHANGE = 5,
    /**
     * A message sent when a message is pinned in a channel
     *
     * Value: 6
     * Name: CHANNEL_PINNED_MESSAGE
     * Rendered Content: "{author} pinned a message to this channel."
     * Deletable: true
     */
    CHANNEL_PINNED_MESSAGE = 6,
    /**
     * A message sent when a user joins a guild
     *
     * Value: 7
     * Name: USER_JOIN
     * Rendered Content: See user join message type , obtained via the formula timestamp_ms % 13
     * Deletable: true
     */
    USER_JOIN = 7,
    /**
     * A message sent when a user subscribes to (boosts) a guild
     *
     * Value: 8
     * Name: PREMIUM_GUILD_SUBSCRIPTION
     * Rendered Content: "{author} just boosted the server{content ? " {content} times"}!"
     * Deletable: true
     */
    PREMIUM_GUILD_SUBSCRIPTION = 8,
    /**
     * A message sent when a user subscribes to (boosts) a guild to tier 1
     *
     * Value: 9
     * Name: PREMIUM_GUILD_SUBSCRIPTION_TIER_1
     * Rendered Content: "{author} just boosted the server{content ? " {content} times"}! {guild} has achieved Level 1! "
     * Deletable: true
     */
    PREMIUM_GUILD_SUBSCRIPTION_TIER_1 = 9,
    /**
     * A message sent when a user subscribes to (boosts) a guild to tier 2
     *
     * Value: 10
     * Name: PREMIUM_GUILD_SUBSCRIPTION_TIER_2
     * Rendered Content: "{author} just boosted the server{content ? " {content} times"}! {guild} has achieved Level 2! "
     * Deletable: true
     */
    PREMIUM_GUILD_SUBSCRIPTION_TIER_2 = 10,
    /**
     * A message sent when a user subscribes to (boosts) a guild to tier 3
     *
     * Value: 11
     * Name: PREMIUM_GUILD_SUBSCRIPTION_TIER_3
     * Rendered Content: "{author} just boosted the server{content ? " {content} times"}! {guild} has achieved Level 3! "
     * Deletable: true
     */
    PREMIUM_GUILD_SUBSCRIPTION_TIER_3 = 11,
    /**
     * A message sent when a news channel is followed
     *
     * Value: 12
     * Name: CHANNEL_FOLLOW_ADD
     * Rendered Content: "{author} has added {content} to this channel. Its most important updates will show up here."
     * Deletable: true
     */
    CHANNEL_FOLLOW_ADD = 12,
    /**
     * A message sent when a guild is disqualified from discovery
     *
     * Value: 14
     * Name: GUILD_DISCOVERY_DISQUALIFIED
     * Rendered Content: "This server has been removed from Server Discovery because it no longer passes all the requirements. Check Server Settings for more details."
     * Deletable: true
     */
    GUILD_DISCOVERY_DISQUALIFIED = 14,
    /**
     * A message sent when a guild requalifies for discovery
     *
     * Value: 15
     * Name: GUILD_DISCOVERY_REQUALIFIED
     * Rendered Content: "This server is eligible for Server Discovery again and has been automatically relisted!"
     * Deletable: true
     */
    GUILD_DISCOVERY_REQUALIFIED = 15,
    /**
     * A message sent when a guild has failed discovery requirements for a week
     *
     * Value: 16
     * Name: GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING
     * Rendered Content: "This server has failed Discovery activity requirements for 1 week. If this server fails for 4 weeks in a row, it will be automatically removed from Discovery."
     * Deletable: true
     */
    GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING = 16,
    /**
     * A message sent when a guild has failed discovery requirements for 3 weeks
     *
     * Value: 17
     * Name: GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING
     * Rendered Content: "This server has failed Discovery activity requirements for 3 weeks in a row. If this server fails for 1 more week, it will be removed from Discovery."
     * Deletable: true
     */
    GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING = 17,
    /**
     * A message sent when a thread is created
     *
     * Value: 18
     * Name: THREAD_CREATED
     * Rendered Content: "{author} started a thread: {content} . See all threads."
     * Deletable: true
     */
    THREAD_CREATED = 18,
    /**
     * A message sent when a user replies to a message
     *
     * Value: 19
     * Name: REPLY
     * Rendered Content: "{content}"
     * Deletable: true
     */
    REPLY = 19,
    /**
     * A message sent when a user uses a slash command
     *
     * Value: 20
     * Name: CHAT_INPUT_COMMAND
     * Rendered Content: "{content}"
     * Deletable: true
     */
    CHAT_INPUT_COMMAND = 20,
    /**
     * A message sent when a thread starter message is added to a thread
     *
     * Value: 21
     * Name: THREAD_STARTER_MESSAGE
     * Rendered Content: "{referenced_message?.content}" ?? "Sorry, we couldn't load the first message in this thread"
     * Deletable: false
     */
    THREAD_STARTER_MESSAGE = 21,
    /**
     * A message sent to remind users to invite friends to a guild
     *
     * Value: 22
     * Name: GUILD_INVITE_REMINDER
     * Rendered Content: "Wondering who to invite?\nStart by inviting anyone who can help you build the server!"
     * Deletable: true
     */
    GUILD_INVITE_REMINDER = 22,
    /**
     * A message sent when a user uses a context menu command
     *
     * Value: 23
     * Name: CONTEXT_MENU_COMMAND
     * Rendered Content: "{content}"
     * Deletable: true
     */
    CONTEXT_MENU_COMMAND = 23,
    /**
     * A message sent when auto moderation takes an action
     *
     * Value: 24
     * Name: AUTO_MODERATION_ACTION
     * Rendered Content: Special embed rendered from embeds[0]
     * Deletable: true 1
     */
    AUTO_MODERATION_ACTION = 24,
    /**
     * A message sent when a user purchases or renews a role subscription
     *
     * Value: 25
     * Name: ROLE_SUBSCRIPTION_PURCHASE
     * Rendered Content: "{author} {is_renewal ? "renewed" : "joined"} {role_subscription.tier_name} and has been a subscriber of {guild} for {role_subscription.total_months_subscribed} month(?s)!"
     * Deletable: true
     */
    ROLE_SUBSCRIPTION_PURCHASE = 25,
    /**
     * A message sent when a user is upsold to a premium interaction
     *
     * Value: 26
     * Name: INTERACTION_PREMIUM_UPSELL
     * Rendered Content: "{content}"
     * Deletable: true
     */
    INTERACTION_PREMIUM_UPSELL = 26,
    /**
     * A message sent when a stage channel starts
     *
     * Value: 27
     * Name: STAGE_START
     * Rendered Content: "{author} started {content} "
     * Deletable: true
     */
    STAGE_START = 27,
    /**
     * A message sent when a stage channel ends
     *
     * Value: 28
     * Name: STAGE_END
     * Rendered Content: "{author} ended {content} "
     * Deletable: true
     */
    STAGE_END = 28,
    /**
     * A message sent when a user starts speaking in a stage channel
     *
     * Value: 29
     * Name: STAGE_SPEAKER
     * Rendered Content: "{author} is now a speaker."
     * Deletable: true
     */
    STAGE_SPEAKER = 29,
    /**
     * A message sent when a user raises their hand in a stage channel
     *
     * Value: 30
     * Name: STAGE_RAISE_HAND
     * Rendered Content: "{author} requested to speak."
     * Deletable: true
     */
    STAGE_RAISE_HAND = 30,
    /**
     * A message sent when a stage channel's topic is changed
     *
     * Value: 31
     * Name: STAGE_TOPIC
     * Rendered Content: "{author} changed the Stage topic: {content} "
     * Deletable: true
     */
    STAGE_TOPIC = 31,
    /**
     * A message sent when a user purchases an application premium subscription
     *
     * Value: 32
     * Name: GUILD_APPLICATION_PREMIUM_SUBSCRIPTION
     * Rendered Content: "{author} upgraded {application ?? "a deleted application"} to premium for this server!"
     * Deletable: true
     */
    GUILD_APPLICATION_PREMIUM_SUBSCRIPTION = 32,
    /**
     * A message sent when a user gifts a premium (Nitro) referral
     *
     * Value: 35
     * Name: PREMIUM_REFERRAL
     * Rendered Content: "{content}"
     * Deletable: true
     */
    PREMIUM_REFERRAL = 35,
    /**
     * A message sent when a user enabled lockdown for the guild
     *
     * Value: 36
     * Name: GUILD_INCIDENT_ALERT_MODE_ENABLED
     * Rendered Content: "{author} enabled security actions until {content}."
     * Deletable: true
     */
    GUILD_INCIDENT_ALERT_MODE_ENABLED = 36,
    /**
     * A message sent when a user disables lockdown for the guild
     *
     * Value: 37
     * Name: GUILD_INCIDENT_ALERT_MODE_DISABLED
     * Rendered Content: "{author} disabled security actions."
     * Deletable: true
     */
    GUILD_INCIDENT_ALERT_MODE_DISABLED = 37,
    /**
     * A message sent when a user reports a raid for the guild
     *
     * Value: 38
     * Name: GUILD_INCIDENT_REPORT_RAID
     * Rendered Content: "{author} reported a raid in {guild}."
     * Deletable: true
     */
    GUILD_INCIDENT_REPORT_RAID = 38,
    /**
     * A message sent when a user reports a false alarm for the guild
     *
     * Value: 39
     * Name: GUILD_INCIDENT_REPORT_FALSE_ALARM
     * Rendered Content: "{author} reported a false alarm in {guild}."
     * Deletable: true
     */
    GUILD_INCIDENT_REPORT_FALSE_ALARM = 39,
    /**
     * A message sent when no one sends a message in the current channel for 1 hour
     *
     * Value: 40
     * Name: GUILD_DEADCHAT_REVIVE_PROMPT
     * Rendered Content: "{content}"
     * Deletable: true
     */
    GUILD_DEADCHAT_REVIVE_PROMPT = 40,
    /**
     * A message sent when a user buys another user a gift
     *
     * Value: 41
     * Name: CUSTOM_GIFT
     * Rendered Content: Special embed rendered from embeds[0].url and gift_info
     * Deletable: true
     */
    CUSTOM_GIFT = 41,
    /**
     * Value: 42
     * Name: GUILD_GAMING_STATS_PROMPT
     * Rendered Content: "{content}"
     * Deletable: true
     */
    GUILD_GAMING_STATS_PROMPT = 42,
    /**
     * A message sent when a user purchases a guild product
     *
     * Value: 44
     * Name: PURCHASE_NOTIFICATION
     * Rendered Content: "{author} has purchased {purchase_notification.guild_product_purchase.product_name}!"
     * Deletable: true
     */
    PURCHASE_NOTIFICATION = 44,
    /**
     * A message sent when a poll is finalized
     *
     * Value: 46
     * Name: POLL_RESULT
     * Rendered Content: Special embed rendered from embeds[0]
     * Deletable: true
     */
    POLL_RESULT = 46,
    /**
     * A message sent by the Discord Updates account when a new changelog is posted
     *
     * Value: 47
     * Name: CHANGELOG
     * Rendered Content: "{content}"
     * Deletable: true
     */
    CHANGELOG = 47,
    /**
     * A message sent when a Nitro promotion is triggered
     *
     * Value: 48
     * Name: NITRO_NOTIFICATION
     * Rendered Content: Special embed rendered from content
     * Deletable: true
     */
    NITRO_NOTIFICATION = 48,
    /**
     * A message sent when a voice channel is linked to a lobby
     *
     * Value: 49
     * Name: CHANNEL_LINKED_TO_LOBBY
     * Rendered Content: "{content}"
     * Deletable: true
     */
    CHANNEL_LINKED_TO_LOBBY = 49,
    /**
     * A local-only ephemeral message sent when a user is prompted to gift Nitro to a friend on their friendship anniversary
     *
     * Value: 50
     * Name: GIFTING_PROMPT
     * Rendered Content: Special embed
     * Deletable: true
     */
    GIFTING_PROMPT = 50,
    /**
     * A local-only message sent when a user receives an in-game message NUX
     *
     * Value: 51
     * Name: IN_GAME_MESSAGE_NUX
     * Rendered Content: "{author} messaged you from {application.name}. In-game chat may not include rich messaging features such as images, polls, or apps. Learn More "
     * Deletable: true
     */
    IN_GAME_MESSAGE_NUX = 51,
    /**
     * A message sent when a user accepts a guild join request
     *
     * Value: 52
     * Name: GUILD_JOIN_REQUEST_ACCEPT_NOTIFICATION 2
     * Rendered Content: "{join_request.user}'s application to {content} was approved! Welcome!"
     * Deletable: true
     */
    GUILD_JOIN_REQUEST_ACCEPT_NOTIFICATION = 52,
    /**
     * A message sent when a user rejects a guild join request
     *
     * Value: 53
     * Name: GUILD_JOIN_REQUEST_REJECT_NOTIFICATION 2
     * Rendered Content: "{join_request.user}'s application to {content} was rejected."
     * Deletable: true
     */
    GUILD_JOIN_REQUEST_REJECT_NOTIFICATION = 53,
    /**
     * A message sent when a user withdraws a guild join request
     *
     * Value: 54
     * Name: GUILD_JOIN_REQUEST_WITHDRAWN_NOTIFICATION 2
     * Rendered Content: "{join_request.user}'s application to {content} has been withdrawn."
     * Deletable: true
     */
    GUILD_JOIN_REQUEST_WITHDRAWN_NOTIFICATION = 54,
    /**
     * A message sent when a user upgrades to HD streaming
     *
     * Value: 55
     * Name: HD_STREAMING_UPGRADED
     * Rendered Content: "{author} activated HD Splash Potion "
     * Deletable: true
     */
    HD_STREAMING_UPGRADED = 55,
    /**
     * A message sent when a user resolves a moderation report by deleting the offending message
     *
     * Value: 58
     * Name: REPORT_TO_MOD_DELETED_MESSAGE
     * Rendered Content: "{author} deleted the message"
     * Deletable: true
     */
    REPORT_TO_MOD_DELETED_MESSAGE = 58,
    /**
     * A message sent when a user resolves a moderation report by timing out the offending user
     *
     * Value: 59
     * Name: REPORT_TO_MOD_TIMEOUT_USER
     * Rendered Content: "{author} timed out {mentions [0] }"
     * Deletable: true
     */
    REPORT_TO_MOD_TIMEOUT_USER = 59,
    /**
     * A message sent when a user resolves a moderation report by kicking the offending user
     *
     * Value: 60
     * Name: REPORT_TO_MOD_KICK_USER
     * Rendered Content: "{author} kicked {mentions [0] }"
     * Deletable: true
     */
    REPORT_TO_MOD_KICK_USER = 60,
    /**
     * A message sent when a user resolves a moderation report by banning the offending user
     *
     * Value: 61
     * Name: REPORT_TO_MOD_BAN_USER
     * Rendered Content: "{author} banned {mentions [0] }"
     * Deletable: true
     */
    REPORT_TO_MOD_BAN_USER = 61,
    /**
     * A message sent when a user resolves a moderation report
     *
     * Value: 62
     * Name: REPORT_TO_MOD_CLOSED_REPORT
     * Rendered Content: "{author} resolved this flag"
     * Deletable: true
     */
    REPORT_TO_MOD_CLOSED_REPORT = 62,
    /**
     * A message sent when a user adds a new emoji to a guild
     *
     * Value: 63
     * Name: EMOJI_ADDED
     * Rendered Content: "{author} added a new emoji, {content} :{emoji.name}: "
     * Deletable: true
     */
    EMOJI_ADDED = 63,
}

export const enum MessageFlags {
    /**
     * Message has been published to subscribed channels (via Channel Following)
     *
     * Value: 1 << 0
     */
    CROSSPOSTED = 1 << 0,
    /**
     * Message originated from a message in another channel (via Channel Following)
     */
    IS_CROSSPOST = 1 << 1,
    /**
     * Embeds will not be included when serializing this message
     */
    SUPPRESS_EMBEDS = 1 << 2,
    /**
     * Source message for this crosspost has been deleted (via Channel Following)
     */
    SOURCE_MESSAGE_DELETED = 1 << 3,
    /**
     * Message came from the urgent message system
     */
    URGENT = 1 << 4,
    /**
     * Message has an associated thread, with the same ID as the message
     */
    HAS_THREAD = 1 << 5,
    /**
     * Message is only visible to the user who invoked the interaction
     */
    EPHEMERAL = 1 << 6,
    /**
     * Message is an interaction response and the bot is "thinking"
     */
    LOADING = 1 << 7,
    /**
     * Some roles were not mentioned and added to the thread
     */
    FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 1 << 8,
    /**
     * Message is hidden from the guild's feed
     */
    GUILD_FEED_HIDDEN = 1 << 9,
    /**
     * Message contains a link that impersonates Discord
     */
    SHOULD_SHOW_LINK_NOT_DISCORD_WARNING = 1 << 10,
    /**
     * Message will not trigger push and desktop notifications
     */
    SUPPRESS_NOTIFICATIONS = 1 << 12,
    /**
     * Message's audio attachment is rendered as a voice message
     */
    IS_VOICE_MESSAGE = 1 << 13,
    /**
     * Message has a forwarded message snapshot attached
     */
    HAS_SNAPSHOT = 1 << 14,
    /**
     * Message contains components from version 2 of the UI kit
     */
    IS_COMPONENTS_V2 = 1 << 15,
    /**
     * Message was triggered by the social layer integration
     */
    SENT_BY_SOCIAL_LAYER_INTEGRATION = 1 << 16,
}
