/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LiteralUnion } from "type-fest";

export type i18nMessages = LiteralUnion<
    "TITLE_BAR_CLOSE_WINDOW" | "TITLE_BAR_MAXIMIZE_WINDOW" | "TITLE_BAR_MINIMIZE_WINDOW" | "en-US" | "en-GB" | "zh-CN" | "zh-TW" | "cs" | "da" | "nl" | "fr" | "de" | "el" | "hu" | "it" | "ja" | "ko" | "pl" | "pt-BR" | "ru" | "es-ES" | "sv-SE" | "tr" | "bg" | "uk" | "fi" | "no" | "hr" | "ro" | "lt" | "th" | "vi" | "hi" | "KEYBIND_DESCRIPTION_MODAL_NAVIGATE_SERVERS" | "KEYBIND_DESCRIPTION_MODAL_NAVIGATE_CHANNELS" | "KEYBIND_DESCRIPTION_MODAL_NAVIGATE_BACK_FORWARD" | "KEYBIND_DESCRIPTION_MODAL_UNREAD_CHANNELS" | "KEYBIND_DESCRIPTION_MODAL_UNREAD_MENTION_CHANNELS" | "KEYBIND_DESCRIPTION_MODAL_NAVIGATE_TO_CALL" | "KEYBIND_DESCRIPTION_MODAL_TOGGLE_PREVIOUS_GUILD" | "KEYBIND_DESCRIPTION_MODAL_QUICKSWITCHER" | "KEYBIND_DESCRIPTION_MODAL_CREATE_GUILD" | "DND_OPERATION_LABEL_START" | "DND_OPERATION_LABEL_MOVE" | "DND_OPERATION_LABEL_DROP" | "DND_OPERATION_LABEL_CANCEL" | "KEYBIND_DESCRIPTION_MODAL_MARK_SERVER_READ" | "KEYBIND_DESCRIPTION_MODAL_MARK_CHANNEL_READ" | "KEYBIND_DESCRIPTION_MODAL_CREATE_DM_GROUP" | "KEYBIND_DESCRIPTION_MODAL_TOGGLE_PINS" | "KEYBIND_DESCRIPTION_MODAL_TOGGLE_INBOX" | "KEYBIND_DESCRIPTION_MODAL_MARK_TOP_INBOX_CHANNEL_READ" | "KEYBIND_DESCRIPTION_MODAL_TOGGLE_USERS" | "KEYBIND_DESCRIPTION_MODAL_SEARCH_EMOJIS" | "KEYBIND_DESCRIPTION_MODAL_SEARCH_GIFS" | "KEYBIND_DESCRIPTION_MODAL_SEARCH_STICKERS" | "KEYBIND_DESCRIPTION_MODAL_SCROLL_CHAT" | "KEYBIND_DESCRIPTION_MODAL_JUMP_TO_FIRST_UNREAD" | "KEYBIND_DESCRIPTION_MODAL_FOCUS_TEXT_AREA" | "KEYBIND_DESCRIPTION_MODAL_UPLOAD_FILE" | "KEYBIND_DESCRIPTION_MODAL_TOGGLE_MUTE" | "KEYBIND_DESCRIPTION_MODAL_TOGGLE_DEAFEN" | "KEYBIND_DESCRIPTION_MODAL_CALL_ACCEPT" | "KEYBIND_DESCRIPTION_MODAL_CALL_DECLINE" | "KEYBIND_DESCRIPTION_MODAL_CALL_START" | "KEYBIND_DESCRIPTION_MODAL_TOGGLE_HELP" | "KEYBIND_DESCRIPTION_MODAL_SEARCH" | "KEYBIND_DESCRIPTION_MODAL_EASTER_EGG" | "EDIT_MESSAGE" | "DELETE_MESSAGE" | "PIN_MESSAGE" | "ADD_REACTION" | "MESSAGE_ACTION_REPLY" | "COPY_TEXT" | "MARK_UNREAD" | "GUILDS_BAR_A11Y_LABEL" | "SERVERS" | "NEW" | "ADD_A_SERVER" | "GUILD_DISCOVERY_TOOLTIP" | "ACCOUNT_A11Y_LABEL" | "GUILD_SIDEBAR_A11Y_LABEL" | "UNKNOWN_USER" | "LOADING" | "LOADING_DID_YOU_KNOW" | "CONNECTING_PROBLEMS_CTA" | "TWEET_US" | "SERVER_STATUS" | "NOTIFICATION_CENTER_INCOMING_FRIEND_REQUEST" | "COMMAND_SHRUG_MESSAGE_DESCRIPTION" | "DIRECT_MESSAGES" | "GUILD_TOOLTIP_A11Y_LABEL" | "FAVORITES_GUILD_NAME" | "MEMBER_VERIFICATION_FOLDER_NAME" | "DND_DROP_ABOVE" | "DND_DROP_COMBINE" | "GUILD_FOLDER_TOOLTIP_A11Y_LABEL" | "DND_END_OF_LIST" | "GUILD_SIDEBAR_ACTIONS_BUTTON" | "PREMIUM_GUILD_TIER_3" | "PREMIUM_GUILD_SUBSCRIPTION_SUBSCRIBER_COUNT_TOOLTIP" | "CHANNELS" | "NEW_UNREADS" | "NEW_MENTIONS" | "UNMUTE" | "MUTE" | "DEAFEN" | "SET_STATUS" | "LABEL_WITH_ONLINE_STATUS" | "STATUS_ONLINE" | "USER_SETTINGS" | "CHANNEL_HEADER_BAR_A11Y_LABEL" | "TEXT_CHANNEL" | "UPLOAD_TO" | "UPLOAD_AREA_HELP" | "THREADS" | "NOTIFICATION_SETTINGS" | "PINNED_MESSAGES" | "MEMBER_LIST_SHOWN" | "SEARCH" | "SEARCH_CLEAR" | "INBOX" | "HELP" | "TEXTAREA_PLACEHOLDER" | "TEXTAREA_TEXT_CHANNEL_A11Y_LABEL" | "CHANNEL_A11Y_LABEL" | "CHANNEL_CHAT_HEADING" | "CHANNEL_MESSAGES_A11Y_LABEL" | "CHANNEL_MESSAGES_A11Y_DESCRIPTION" | "CHAT_ATTACH_UPLOAD_A_FILE" | "CHAT_ATTACH_UPLOAD_TEXT_AS_FILE" | "CREATE_THREAD" | "CHAT_ATTACH_USE_SLASH_COMMAND" | "CHAT_ATTACH_UPLOAD_OR_INVITE" | "PREMIUM_GIFT_BUTTON_TOOLTIP" | "PREMIUM_GIFT_BUTTON_LABEL" | "GIF_BUTTON_LABEL" | "STICKER_BUTTON_LABEL" | "SELECT_EMOJI" | "CHARACTER_COUNT_CLOSE_TO_LIMIT" | "MEMBERS_LIST_LANDMARK_LABEL" | "MEMBERS" | "PREMIUM_GUILD_SUBSCRIPTIONS_GOAL" | "PREMIUM_GUILD_TIER_3_SHORT" | "PREMIUM_GUILD_SUBSCRIPTIONS_PROGRESS_BAR_BLURB" | "PREMIUM_GUILD_SUBSCRIPTIONS_PROGRESS_BAR_COMPLETED_BLURB" | "PREMIUM_GUILD_SUBSCRIPTIONS_NUDGE_TOOLTIP_COMPLETE" | "PREMIUM_GUILD_SUBSCRIPTIONS_PROGRESS_BAR_TADA_ICON_ALT_TEXT" | "GUILD_EVENTS" | "GUILD_SIDEBAR_DEFAULT_CHANNEL_A11Y_LABEL" | "CHANNEL_TOOLTIP_TEXT_LIMITED" | "CREATE_INSTANT_INVITE" | "EDIT_CHANNEL" | "CHANNEL_TOOLTIP_TEXT" | "CATEGORY_A11Y_LABEL" | "CREATE_CHANNEL" | "CHANNEL_TOOLTIP_RULES" | "GUILD_SIDEBAR_ANNOUNCEMENT_CHANNEL_A11Y_LABEL" | "CHANNEL_TOOLTIP_ANNOUNCEMENTS" | "GUILD_SIDEBAR_STAGE_CHANNEL_A11Y_LABEL" | "OPEN_CHAT" | "CHANNEL_TOOLTIP_STAGE_LIMITED" | "CHANNEL_TOOLTIP_TEXT_ACTIVE_THREADS" | "THREAD_GROUP_A11Y_LABEL" | "GUILD_SIDEBAR_THREAD_A11Y_LABEL" | "GUILD_SIDEBAR_VOICE_CHANNEL_A11Y_LABEL" | "GUILD_SIDEBAR_CHANNEL_A11Y_LABEL_UNREAD" | "GUILD_SIDEBAR_VOICE_CHANNEL_A11Y_LABEL_USERS" | "CHANNEL_TOOLTIP_VOICE" | "STATUS_UNKNOWN" | "MESSAGE_A11Y_ROLE_DESCRIPTION" | "ROLE_ICON_ALT_TEXT" | "CHANNEL_MESSAGE_REPLY_A11Y_LABEL" | "IMAGE" | "MESSAGE_EDITED" | "MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL" | "EMOJI_TOOLTIP_CLICK_CTA" | "REMOVE_MESSAGE_ATTACHMENT" | "VERIFIED_BOT_TOOLTIP" | "SUPPRESS_ALL_EMBEDS" | "CHANNEL_MEMBERS_A11Y_LABEL" | "GUILD_OWNER" | "PREMIUM_GUILD_SUBSCRIPTION_TOOLTIP" | "STATUS_ONLINE_MOBILE" | "STATUS_IDLE" | "STREAMING" | "LISTENING_TO" | "WATCHING" | "COMPETING" | "PLAYING_GAME" | "STATUS_DND" | "CHAT_ATTACH_INVITE_TO_LISTEN" | "ACTIVITY_PANEL_GO_LIVE_STREAM_GAME" | "SEARCH_ANSWER_HAS_LINK" | "SEARCH_ANSWER_HAS_EMBED" | "SEARCH_ANSWER_HAS_ATTACHMENT" | "SEARCH_ANSWER_HAS_VIDEO" | "SEARCH_ANSWER_HAS_IMAGE" | "SEARCH_ANSWER_HAS_SOUND" | "SEARCH_ANSWER_HAS_STICKER" | "SEARCH_FILTER_FROM" | "SEARCH_FILTER_MENTIONS" | "SEARCH_FILTER_HAS" | "SEARCH_FILTER_FILE_TYPE" | "SEARCH_FILTER_FILE_NAME" | "SEARCH_FILTER_BEFORE" | "SEARCH_FILTER_ON" | "SEARCH_FILTER_DURING" | "SEARCH_FILTER_AFTER" | "SEARCH_FILTER_IN" | "SEARCH_FILTER_PINNED" | "MESSAGE_UTILITIES_A11Y_LABEL" | "EDIT" | "MORE" | "SEARCH_SHORTCUT_TODAY" | "SEARCH_SHORTCUT_YESTERDAY" | "SEARCH_SHORTCUT_WEEK" | "SEARCH_SHORTCUT_MONTH" | "SEARCH_SHORTCUT_YEAR" | "SEARCH_GROUP_HEADER_SEARCH_OPTIONS" | "SEARCH_GROUP_HEADER_HISTORY" | "LEARN_MORE" | "SEARCH_ANSWER_FROM" | "SEARCH_ANSWER_MENTIONS" | "SEARCH_ANSWER_HAS" | "SEARCH_ANSWER_DATE" | "SEARCH_ANSWER_IN" | "SEARCH_ANSWER_BOOLEAN" | "SEARCH_CLEAR_HISTORY" | "SEARCH_FROM_SUGGESTIONS" | "MEMBER_LIST_HIDDEN" | "SEARCH_RESULTS_SECTION_LABEL" | "SEARCH_NEWEST_SHORT" | "SEARCH_OLDEST_SHORT" | "SEARCH_MOST_RELEVANT_SHORT" | "SEARCHING" | "TOTAL_RESULTS" | "JUMP" | "REPLY_QUOTE_MESSAGE_NOT_LOADED" | "COPY_MESSAGE_LINK" | "COPY_ID" | "MESSAGE_ACTIONS_MENU_LABEL" | "ACTIVE_THREADS_POPOUT_HEADER" | "ACTIVE_THREADS_POPOUT_LINK" | "THREAD_BROWSER_TIMESTAMP_MINUTES" | "THREAD_BROWSER_TIMESTAMP_HOURS" | "THREAD_BROWSER_TIMESTAMP_DAYS" | "THREAD_BROWSER_TIMESTAMP_MORE_THAN_MONTH" | "OPEN_CHANNEL_TOPIC" | "VIDEO" | "REPLY_QUOTE_NO_TEXT_CONTENT" | "PLAY" | "NEW_MEMBER_BADGE_TOOLTIP_TEXT" | "USER_SETTINGS_MY_ACCOUNT" | "USER_SETTINGS_PROFILES" | "PRIVACY_AND_SAFETY" | "AUTHORIZED_APPS" | "AUTH_SESSIONS" | "CONNECTIONS" | "CLIPS" | "FRIEND_REQUESTS" | "BILLING_SETTINGS" | "PREMIUM" | "PREMIUM_GUILD_SUBSCRIPTION_TITLE" | "SUBSCRIPTIONS_TITLE" | "GIFT_INVENTORY" | "BILLING" | "APP_SETTINGS" | "APPEARANCE" | "ACCESSIBILITY" | "VOICE_AND_VIDEO" | "POGGERMODE" | "TEXT_AND_IMAGES" | "NOTIFICATIONS" | "KEYBINDS" | "LANGUAGE" | "USER_SETTINGS_WINDOWS_SETTINGS" | "USER_SETTINGS_LINUX_SETTINGS" | "STREAMER_MODE" | "SETTINGS_ADVANCED" | "ACTIVITY_SETTINGS" | "ACTIVITY_PRIVACY" | "REGISTERED_GAMES" | "OVERLAY" | "WHATS_NEW" | "USER_SETTINGS_HYPESQUAD" | "LOGOUT" | "BETA" | "USER_SETTINGS_ACCOUNT_PASSWORD_AND_AUTHENTICATION" | "CHANGE_PASSWORD" | "USER_SETTINGS_EDIT_USER_PROFILE" | "ACTIONS" | "HYPESQUAD_ONLINE_BADGE_TOOLTIP" | "HYPESQUAD_HOUSE_1" | "ACTIVE_DEVELOPER_BADGE_TOOLTIP" | "PROFILE_USER_BADGES" | "USER_SETTINGS_LABEL_USERNAME" | "USER_SETTINGS_ACCOUNT_EDIT_USERNAME_A11Y_LABEL" | "USER_SETTINGS_ACCOUNT_EDIT_EMAIL_A11Y_LABEL" | "USER_SETTINGS_ACCOUNT_REVEAL_EMAIL_A11Y_LABEL" | "USER_SETTINGS_ACCOUNT_HIDE_EMAIL_A11Y_LABEL" | "USER_SETTINGS_LABEL_EMAIL" | "REVEAL" | "USER_SETTINGS_ACCOUNT_REVEAL_PHONE_A11Y_LABEL" | "USER_SETTINGS_ACCOUNT_HIDE_PHONE_A11Y_LABEL" | "USER_SETTINGS_LABEL_PHONE_NUMBER" | "USER_SETTINGS_ACCOUNT_REMOVE_PHONE_A11Y_LABEL" | "REMOVE" | "USER_SETTINGS_ACCOUNT_EDIT_PHONE_A11Y_LABEL" | "TWO_FA_VIEW_BACKUP_CODES" | "TWO_FA_ENABLED" | "TWO_FA_DESCRIPTION" | "TWO_FA_DISABLED_FOR_SERVER_SUBSCRIPTION_MOD" | "MFA_SMS_AUTH_CURRENT_PHONE" | "MFA_SMS_PHONE_NUMBER_REVEAL" | "MFA_SMS_ENABLE" | "CHANGE_PHONE_NUMBER" | "MFA_SMS_AUTH" | "MFA_SMS_AUTH_SALES_PITCH" | "TWO_FA_REMOVE" | "USER_SETTINGS_ACCOUNT_REMOVAL_SECTION" | "USER_SETTINGS_ACCOUNT_REMOVAL_DESCRIPTION" | "DISABLE_ACCOUNT" | "DELETE_ACCOUNT" | "CLOSE" | "PREMIUM_BADGE_TOOLTIP" | "SELECT" | "REPLYING_TO" | "SUPER_REACTION_NITRO_TOOLTIP" | "YOURE_VIEWING_OLDER_MESSAGES" | "JUMP_TO_PRESENT" | "REACT_WITH_COUNT_A11Y_LABEL" | "SEARCH_NO_RESULTS" | "GUILD_SIDEBAR_CHANNEL_A11Y_LABEL_LIMIT" | "COPY_LINK" | "DELETE" | "GUILD_SIDEBAR_DEFAULT_CHANNEL_A11Y_LABEL_WITH_MENTIONS" | "NEW_MESSAGES" | "NEW_MESSAGES_PILL" | "JUMP_TO_LAST_UNREAD_MESSAGE" | "MARK_AS_READ",
    string
>;
