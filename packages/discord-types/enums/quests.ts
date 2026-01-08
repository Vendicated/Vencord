export const enum QuestRewardType {
    REWARD_CODE = 1,
    IN_GAME = 2,
    COLLECTIBLE = 3,
    VIRTUAL_CURRENCY = 4,
    FRACTIONAL_PREMIUM = 5,
}

export const enum QuestPlatform {
    CROSS_PLATFORM = 0,
    XBOX = 1,
    PLAYSTATION = 2,
    SWITCH = 3,
    PC = 4,
}

export const enum QuestTargetedContent {
    GIFT_INVENTORY_SETTINGS_BADGE = 0,
    QUEST_BAR = 1,
    QUEST_INVENTORY_CARD = 2,
    QUESTS_EMBED = 3,
    ACTIVITY_PANEL = 4,
    QUEST_LIVE_STREAM = 5,
    MEMBERS_LIST = 6,
    QUEST_BADGE = 7,
    GIFT_INVENTORY_FOR_YOU = 8,
    GIFT_INVENTORY_OTHER = 9,
    QUEST_BAR_V2 = 10,
    QUEST_HOME_DESKTOP = 11,
    QUEST_HOME_MOBILE = 12,
    QUEST_BAR_MOBILE = 13,
    THIRD_PARTY_APP = 14,
    QUEST_BOTTOM_SHEET = 15,
    QUEST_EMBED_MOBILE = 16,
    QUEST_HOME_MOVE_CALLOUT = 17,
    DISCOVERY_SIDEBAR = 18,
    QUEST_SHARE_LINK = 19,
    CONNECTIONS_MODAL = 20,
    DISCOVERY_COMPASS = 21,
    TROPHY_CASE_CARD = 22,
    VIDEO_MODAL = 23,
    VIDEO_MODAL_END_CARD = 24,
    REWARD_MODAL = 25,
    EXCLUDED_QUEST_EMBED = 26,
    VIDEO_MODAL_MOBILE = 27,
    ORBS_ANNOUNCEMENT_MODAL = 28,
    ORBS_BALANCE_MENU = 29,
    QUEST_ENROLLMENT_BLOCKED_BOTTOM_SHEET = 30,
    ORBS_SHOP_HERO_CTA = 31,
    QUEST_ENROLLMENT_BLOCKED_MODAL = 32,
    INTERNAL_PREVIEW_TOOL = 33,
    ORBS_REHEAT_COACHMARK_CTA = 34,
    INVALID_QUEST_EMBED = 35,
    NOT_SHAREABLE_QUEST_EMBED = 36,
    QUEST_HOME_MOVE_CALLOUT_DISCOVER = 37,
    SPONSORED_QUEST_SHEET = 38,
    MOBILE_ORBS_ONBOARDING_DC = 39,
    RUNNING_ACTIVITY = 40,
    VIDEO_MODAL_PRIMARY_CTA = 41,
    QUEST_HOME_TAKEOVER = 42,
    USER_PROFILE_ACTIVITY = 43,
}

export const enum QuestPlacement {
    INVALID_PLACEMENT = 0,
    DESKTOP_ACCOUNT_PANEL_AREA = 1,
    MOBILE_HOME_DOCK_AREA = 2,
}

export const enum QuestRewardAssignmentMethod {
    ALL = 1,
    TIERED = 2,
}

export const enum QuestRewardExpirationMode {
    NORMAL = 1,
    PREMIUM_EXTENSION = 2,
    PREMIUM_PERMANENT = 3,
}

export const enum QuestFeature {
    POST_ENROLLMENT_CTA = 1,
    QUEST_BAR_V2 = 3,
    EXCLUDE_RUSSIA = 5,
    IN_HOUSE_CONSOLE_QUEST = 6,
    MOBILE_CONSOLE_QUEST = 7,
    START_QUEST_CTA = 8,
    REWARD_HIGHLIGHTING = 9,
    FRACTIONS_QUEST = 10,
    ADDITIONAL_REDEMPTION_INSTRUCTIONS = 11,
    PACING_V2 = 12,
    DISMISSAL_SURVEY = 13,
    MOBILE_QUEST_DOCK = 14,
    QUESTS_CDN = 15,
    PACING_CONTROLLER = 16,
    QUEST_HOME_FORCE_STATIC_IMAGE = 17,
    VIDEO_QUEST_FORCE_HLS_VIDEO = 18,
    VIDEO_QUEST_FORCE_END_CARD_CTA_SWAP = 19,
    EXPERIMENTAL_TARGETING_TRAITS = 20,
    DO_NOT_DISPLAY = 21,
    EXTERNAL_DIALOG = 22,
    MOBILE_ONLY_QUEST_PUSH_TO_MOBILE = 23,
    MANUAL_HEARTBEAT_INITIALIZATION = 24,
    CLOUD_GAMING_ACTIVITY = 25,
    NON_GAMING_PLAY_QUEST = 26,
    ACTIVITY_QUEST_AUTO_ENROLLMENT = 27,
    PACKAGE_ACTION_ADVENTURE = 28,
    PACKAGE_RPG_MMO = 29,
    PACKAGE_RACING_SPORTS = 30,
    PACKAGE_SANDBOX_CREATIVE = 31,
    PACKAGE_FAMILY_FRIENDLY = 32,
    PACKAGE_HOLIDAY_SEASON = 33,
    PACKAGE_NEW_YEARS = 34,
}

export const enum QuestDismissibleContentFlags {
    GIFT_INVENTORY_SETTINGS_BADGE = 1,
    QUEST_BAR = 2,
    ACTIVITY_PANEL = 4,
    QUEST_LIVE_STREAM = 8,
}

export const enum QuestUserQuestStatus {
    UNACCEPTED = 0,
    ACCEPTED = 1,
    IN_PROGRESS = 2,
    COMPLETED = 3,
    CLAIMED = 4,
}

/** Task types for quest completion requirements. */
export const enum QuestTaskType {
    STREAM_ON_DESKTOP = "STREAM_ON_DESKTOP",
    PLAY_ON_DESKTOP = "PLAY_ON_DESKTOP",
    PLAY_ON_XBOX = "PLAY_ON_XBOX",
    PLAY_ON_PLAYSTATION = "PLAY_ON_PLAYSTATION",
    PLAY_ON_DESKTOP_V2 = "PLAY_ON_DESKTOP_V2",
    WATCH_VIDEO = "WATCH_VIDEO",
    WATCH_VIDEO_ON_MOBILE = "WATCH_VIDEO_ON_MOBILE",
    PLAY_ACTIVITY = "PLAY_ACTIVITY",
    ACHIEVEMENT_IN_GAME = "ACHIEVEMENT_IN_GAME",
    ACHIEVEMENT_IN_ACTIVITY = "ACHIEVEMENT_IN_ACTIVITY",
}

/** Operator for combining multiple quest tasks. */
export const enum QuestTaskJoinOperator {
    /** All tasks must be completed. */
    AND = "and",
    /** Any one task must be completed. */
    OR = "or",
}

/** Error types returned from quest API operations. */
export const enum QuestErrorType {
    GENERIC = "generic",
    RATE_LIMITED = "rate_limited",
}

/** Platform mode for quest task selection. */
export const enum QuestPlatformMode {
    DESKTOP = "desktop",
    CONSOLE = "console",
    /** User must select a platform. */
    SELECT = "select",
}

/** Reasons for pausing quest video playback. */
export const enum QuestVideoPauseReason {
    PAUSE_BUTTON = "PAUSE_BUTTON",
    LOST_FOCUS = "LOST_FOCUS",
    MODAL_CLOSED = "MODAL_CLOSED",
}

/** Placement types for quest home takeover. */
export const enum QuestHomePlacement {
    QUEST_HOME_BANNER = "quest_home_banner",
}

/** Client platforms for quest targeting. */
export const enum QuestClientPlatform {
    IOS = "ios",
    ANDROID = "android",
    DESKTOP = "desktop",
    WEB = "web",
    WEB_MOBILE = "web_mobile",
    WEB_TABLET = "web_tablet",
}

/** Quest sharing policy. */
export const enum QuestSharePolicy {
    SHAREABLE_EVERYWHERE = "shareable_everywhere",
    NOT_SHAREABLE = "not_shareable",
}

/** Quest bar UI states. */
export const enum QuestBarState {
    COLLAPSED = "collapsed",
    EXPANDED = "expanded",
    CLOSED = "closed",
    SOFT_DISMISSED = "soft-dismissed",
    RESET_TO_PREVIOUS = "reset-to-previous",
}

/** Reasons for quest embed fallback display. */
export const enum QuestEmbedFallbackReason {
    EXCLUDED_QUEST = "excluded_quest",
    UNKNOWN_QUEST = "unknown_quest",
    NOT_SHAREABLE_QUEST = "not_shareable_quest",
}

/** Console platform selection for quest tasks. */
export const enum QuestConsolePlatformSelection {
    CONSOLE = "CONSOLE",
    DESKTOP = "DESKTOP",
}

/** Call-to-action types for quest UI interactions. */
export const enum QuestContentCTA {
    LEARN_MORE = "LEARN_MORE",
    SHOW_REWARD = "SHOW_REWARD",
    CLAIM_REWARD = "CLAIM_REWARD",
    GET_REWARD_CODE = "GET_REWARD_CODE",
    COPY_REWARD_CODE = "COPY_REWARD_CODE",
    ACCEPT_QUEST = "ACCEPT_QUEST",
    COPY_QUEST_URL = "COPY_QUEST_URL",
    MOBILE_SHARESHEET = "MOBILE_SHARESHEET",
    TRACK_PROGRESS = "TRACK_PROGRESS",
    CONNECT_CONSOLE = "CONNECT_CONSOLE",
    CONNECT_CONSOLE_LINK = "CONNECT_CONSOLE_LINK",
    VIEW_CONSOLE_CONNECTIONS = "VIEW_CONSOLE_CONNECTION",
    VIEW_CONSOLE_CONNECTIONS_LINK = "VIEW_CONSOLE_CONNECTIONS_LINK",
    VIEW_REQUIREMENTS = "VIEW_REQUIREMENTS",
    SELECT_CONSOLE_PLATFORM = "SELECT_CONSOLE_PLATFORM",
    SELECT_DESKTOP_PLATFORM = "SELECT_DESKTOP_PLATFORM",
    DESELECT_PLATFORM = "DESELECT_PLATFORM",
    DEFIBRILLATOR = "DEFIBRILLATOR",
    DEFIBRILLATOR_RECONNECT_CONSOLE = "DEFIBRILLATOR_RECONNECT_CONSOLE",
    OPEN_DISCLOSURE = "OPEN_DISCLOSURE",
    WATCH_STREAM = "WATCH_STREAM",
    WATCH_STREAM_CONFIRM = "WATCH_STREAM_CONFIRM",
    REWARD_LEARN_MORE = "REWARD_LEARN_MORE",
    OPEN_GAME_LINK = "OPEN_GAME_LINK",
    OPEN_CONTEXT_MENU = "OPEN_CONTEXT_MENU",
    OPEN_QUEST_HOME = "OPEN_QUEST_HOME",
    QUEST_BAR_COPY_LINK = "QUEST_BAR.COPY_LINK",
    CONTEXT_MENU_COPY_LINK = "CONTEXT_MENU.COPY_LINK",
    REWARD_MODAL_COPY_LINK = "REWARD_MODAL.COPY_LINK",
    CONTEXT_MENU_HIDE_CONTENT = "CONTEXT_MENU.HIDE_CONTENT",
    CONTEXT_MENU_OPEN_GAME_LINK = "CONTEXT_MENU.OPEN_GAME_LINK",
    CONTEXT_MENU_OPEN_DISCLOSURE = "CONTEXT_MENU.OPEN_DISCLOSURE",
    CONTEXT_MENU_LEARN_MORE = "CONTEXT_MENU.LEARN_MORE",
    HOW_TO_HELP_ARTICLE_XBOX = "HOW_TO_HELP_ARTICLE_XBOX",
    HOW_TO_HELP_ARTICLE_PLAYSTATION = "HOW_TO_HELP_ARTICLE_PLAYSTATION",
    VIEW_QUESTS = "VIEW_QUESTS",
    EXPAND = "EXPAND",
    COLLAPSE = "COLLAPSE",
    START_QUEST = "START_QUEST",
    TRANSCRIPT_ENABLE = "TRANSCRIPT_ENABLE",
    TRANSCRIPT_DISABLE = "TRANSCRIPT_DISABLE",
    CLOSED_CAPTIONING_ENABLE = "CLOSED_CAPTIONING_ENABLE",
    CLOSED_CAPTIONING_DISABLE = "CLOSED_CAPTIONING_DISABLE",
    SEEK_BACKWARD = "SEEK_BACKWARD",
    SEEK_FORWARD = "SEEK_FORWARD",
    WATCH_VIDEO = "WATCH_VIDEO",
    QUEST_BAR_VIDEO_QUEST_PREVIEW = "QUEST_BAR_VIDEO_QUEST_PREVIEW",
    QUEST_HOME_TILE_HEADER_WATCH_VIDEO = "QUEST_HOME_TILE_HEADER_WATCH_VIDEO",
    REDEEM_REWARD = "REDEEM_REWARD",
    VISIT_REDEMPTION_LINK = "VISIT_REDEMPTION_LINK",
    SPONSORED_QUEST_SHEET = "SPONSORED_QUEST_SHEET",
    GAME_PROFILE_OPEN = "GAME_PROFILE_OPEN",
    GAME_STORE_OPEN_GAME_LINK = "GAME_STORE_OPEN_GAME_LINK",
    MOBILE_ORBS_ONBOARDING_DC = "MOBILE_ORBS_ONBOARDING_DC",
}

/** Sort methods for quest list display. */
export const enum QuestSortMethod {
    /** Default sorting by relevance. */
    SUGGESTED = "suggested",
    MOST_RECENT = "most_recent",
    EXPIRING_SOON = "expiring_soon",
    RECENTLY_ENROLLED = "recently_enrolled",
}

/** Filter types for quest tasks. */
export const enum QuestTaskFilter {
    VIDEO = "task_video",
    PLAY = "task_play",
}

/** Filter types for quest rewards. */
export const enum QuestRewardFilter {
    VIRTUAL_CURRENCY = "reward_virtual_currency",
    COLLECTIBLE = "reward_collectible",
    IN_GAME = "reward_in_game",
}

/** Video playback progress states. */
export const enum QuestVideoProgressState {
    UNKNOWN = "UNKNOWN",
    NOT_STARTED = "NOT_STARTED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
}

/** Transcript fetch operation states. */
export const enum QuestTranscriptFetchStatus {
    NONE = "NONE",
    FETCHING = "FETCHING",
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
}

/** Result types from quest enrollment attempts. */
export const enum QuestEnrollmentResult {
    SUCCESS = "success",
    CAPTCHA_FAILED = "captcha_failed",
    UNKNOWN_ERROR = "unknown_error",
    /** Enrollment already in progress. */
    PREVIOUS_IN_FLIGHT_REQUEST = "previous_in_flight_request",
}

/** Reasons why a quest embed was not found. */
export const enum QuestEmbedNotFoundReason {
    NOT_FOUND = "not_found",
    MOBILE_ONLY = "mobile_only",
}

/** Tab filter types for quest list. */
export const enum QuestFilterTab {
    ALL = "all",
    CLAIMED = "claimed",
    /** Internal preview tool only. */
    PREVIEW_TOOL = "preview_tool",
}

/** URL parameter types for quest filtering. */
export const enum QuestFilterParamType {
    TAB = "tab",
    QUEST_ID = "quest_id",
    SORT = "sort",
    FILTER = "filter",
}

/** Location identifiers for quest-related UI and tracking. */
export const enum QuestLocation {
    ACTIVITY_PANEL = "quests_bar_activity_panel",
    QUESTS_MANAGER = "quests_manager",
    QUESTS_CONSOLE_OPTIMISTIC_UPDATES_MANAGER = "quests_console_optimistic_updates_manager",
    USER_SETTINGS_GIFT_INVENTORY = "user_settings_gift_inventory",
    USER_SETTINGS_SEARCH_GIFT_INVENTORY = "user_settings_search_gift_inventory",
    USE_QUESTS = "use_quests",
    STREAM_SOURCE_SELECT = "stream_source_select",
    MEMBERS_LIST = "members_list",
    QUESTS_BAR = "quests_bar",
    QUESTS_BAR_MOBILE = "quests_bar_mobile",
    REWARD_CODE_MODAL = "reward_code_modal",
    INGAME_REWARD_MODAL = "ingame_reward_modal",
    COLLECTIBLE_REWARD_MODAL = "collectible_reward_modal",
    ORBS_REWARD_MODAL = "orbs_reward_modal",
    QUEST_PREVIEW_TOOL = "quest_preview_tool",
    QUEST_PREVIEW_TOOL_2 = "quest_preview_tool_2",
    QUESTS_MINOR_REWARD_CAPPING_CONFIG = "QUESTS_MINOR_REWARD_CAPPING_CONFIG",
    QUESTS_CARD = "quests_card",
    QUESTS_STORE = "quests_store",
    QUEST_CHANNEL_CALL_HEADER = "quests_channel_call_header",
    QUEST_HOME_DESKTOP = "quest_home_desktop",
    QUEST_HOME_MOBILE = "quest_home_mobile",
    QUEST_PROGRESS_BAR = "quest_progress_bar",
    EMBED_MOBILE = "embed_mobile",
    EMBED_DESKTOP = "embed_desktop",
    QUEST_CONTEXT_MENU = "context_menu",
    CODED_LINK = "coded_link",
    QUEST_DISCLOSURE_MODAL = "quest_disclosure_modal",
    DISCOVERY_SIDEBAR = "discovery_sidebar",
    DISCOVERY_COMPASS = "discovery_compass",
    BADGE = "badge",
    COLLECTIBLES_SHOP_HEADER_BAR = "collectibles_shop_header_bar",
    ORBS_ANNOUNCEMENT_MODAL = "orbs_announcement_modal",
    CONFLICT_CHECKS = "conflict_checks",
    VIDEO_MODAL = "video_modal",
    VIDEO_MODAL_MOBILE = "video_modal_mobile",
    GAME_WIDGETS_POPOVER = "game_widgets_popover",
    PRIVATE_CHANNELS_LIST = "private_channels_list",
    INTERNAL_TOOLING = "internal_tooling",
    QUEST_HOME_MOVED_CALLOUT = "quest_home_moved_callout",
    IN_APP_NAVIGATION = "in_app_navigation",
    NAVIGATE_TO_QUEST_HOME_UTIL = "navigate_to_quest_home_util",
    QUEST_DEEP_LINK_UTIL = "quest_deep_link_util",
    YOU_TAB_PROFILE_HEADER = "you_tab_profile_header",
}
