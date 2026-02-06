import { FluxStore } from "..";

export interface QuestTaskProgress {
    value: number;
    event_name?: string;
    updated_at?: string;
    completed_at?: string | null;
    heartbeat?: {
        last_beat_at?: string | null;
        expires_at?: string | null;
    } | null;
}

export interface QuestProgress {
    user_id?: string;
    quest_id?: string;
    completed_at?: string | null;
    claimed_at?: string | null;
    claimed_tier?: number | null;
    enrolled_at?: string;
    enrolledAt?: string;
    last_stream_heartbeat_at?: string | null;
    progress?: Record<string, QuestTaskProgress>;
    stream_progress_seconds?: number;
    streamProgressSeconds?: number;
    dismissed_quest_content?: number;
}

export interface QuestTaskConfigEntry {
    target: number;
    type?: string;
    event_name?: string;
    external_ids?: string[];
    applications?: { id: string }[];
    assets?: Record<string, any>;
    messages?: Record<string, any>;
    [key: string]: any;
}

export interface QuestTaskConfig {
    type?: number;
    join_operator?: string;
    tasks: Record<string, QuestTaskConfigEntry>;
}

export interface QuestMessages {
    quest_name?: string;
    questName?: string;
    game_title?: string;
    game_publisher?: string;
    video_title?: string;
    video_end_cta_subtitle?: string;
    video_end_cta_button_label?: string;
    name?: string;
    name_with_article?: string;
    redemption_instructions_by_platform?: Record<string, string>;
    [key: string]: any;
}

export interface QuestAssets {
    hero?: string | null;
    hero_video?: string | null;
    quest_bar_hero_blurhash?: string | null;
    quest_bar_hero?: string | null;
    quest_bar_hero_video?: string | null;
    game_tile?: string | null;
    logotype?: string | null;
    game_tile_light?: string | null;
    game_tile_dark?: string | null;
    logotype_light?: string | null;
    logotype_dark?: string | null;
    [key: string]: any;
}

export interface QuestColors {
    primary?: string;
    secondary?: string;
    [key: string]: any;
}

export interface QuestApplication {
    id: string;
    name: string;
    link?: string;
}

export interface QuestReward {
    type: number;
    sku_id?: string;
    messages?: QuestMessages;
    orb_quantity?: number;
    [key: string]: any;
}

export interface QuestRewardsConfig {
    assignment_method?: number;
    rewards?: QuestReward[];
    rewards_expire_at?: string;
    platforms?: number[];
    [key: string]: any;
}

export interface QuestVideoMetadata {
    messages?: QuestMessages;
    assets?: Record<string, any>;
    [key: string]: any;
}

export interface QuestCtaConfig {
    link?: string;
    button_label?: string;
    subtitle?: string;
    [key: string]: any;
}

export interface QuestConfig {
    id?: string;
    application: QuestApplication;
    assets?: QuestAssets;
    colors?: QuestColors;
    messages: QuestMessages;
    config_version?: number;
    configVersion?: number;
    starts_at?: string;
    expires_at?: string;
    features?: number[];
    task_config?: QuestTaskConfig;
    task_config_v2?: QuestTaskConfig;
    taskConfig?: QuestTaskConfig;
    rewards_config?: QuestRewardsConfig;
    video_metadata?: QuestVideoMetadata;
    share_policy?: string;
    cta_config?: QuestCtaConfig;
    [key: string]: any;
}

export interface Quest {
    id: string;
    config: QuestConfig;
    user_status?: QuestProgress;
    userStatus?: QuestProgress;
    targeted_content?: any[];
    preview?: boolean;
    traffic_metadata_raw?: string;
    traffic_metadata_sealed?: string;
    [key: string]: any;
}

export class QuestStore extends FluxStore {
    getQuest(id: string): Quest | undefined;
    getQuests(): Quest[];
}
