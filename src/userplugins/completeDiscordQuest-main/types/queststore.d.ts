/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface QuestData {
    key: string;
    value: QuestValue;
}

interface QuestValue {
    id: string;
    preview: boolean;
    config: Config;
    userStatus: UserStatus;
    targetedContent: any[];
}

interface UserStatus {
    userId: string;
    questId: string;
    enrolledAt: string;
    completedAt: string;
    claimedAt: string;
    claimedTier: null;
    lastStreamHeartbeatAt: null;
    streamProgressSeconds: number;
    dismissedQuestContent: number;
    progress: Progress;
}

interface Progress {
    PLAY_ON_DESKTOP: PLAYONDESKTOP2;
}

interface PLAYONDESKTOP2 {
    eventName: string;
    value: number;
    updatedAt: string;
    completedAt: string;
    heartbeat: Heartbeat;
}

interface Heartbeat {
    lastBeatAt: string;
    expiresAt: null;
}

interface Config {
    id: string;
    configVersion: number;
    startsAt: string;
    expiresAt: string;
    features: number[];
    application: Application;
    assets: Assets;
    colors: Colors;
    messages: Messages;
    taskConfigV2: TaskConfigV2;
    rewardsConfig: RewardsConfig;
    sharePolicy: string;
}

interface RewardsConfig {
    assignmentMethod: number;
    rewards: Reward[];
    rewardsExpireAt: string;
    platforms: number[];
}

interface Reward {
    type: number;
    skuId: string;
    messages: Messages2;
    orbQuantity: number;
}

interface Messages2 {
    redemptionInstructionsByPlatform: RedemptionInstructionsByPlatform;
    name: string;
    nameWithArticle: string;
}

interface RedemptionInstructionsByPlatform {
    "0": string;
}

interface TaskConfigV2 {
    tasks: Tasks;
    joinOperator: string;
}

interface Tasks {
    PLAY_ON_DESKTOP: PLAYONDESKTOP;
}

interface PLAYONDESKTOP {
    type: string;
    target: number;
}

interface Messages {
    questName: string;
    gameTitle: string;
    gamePublisher: string;
}

interface Colors {
    primary: string;
    secondary: string;
}

interface Assets {
    hero: string;
    heroVideo: string;
    questBarHero: string;
    questBarHeroVideo: string;
    gameTile: string;
    logotype: string;
}

interface Application {
    id: string;
    name: string;
    link: string;
}

interface QuestAction {
    questContent: number;
    questContentCTA: string;
    questContentPosition?: number;
    questContentRowIndex?: number;
    sourceQuestContent: number;
    sourceQuestContentCTA?: string;
}
