/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SpoofingProfile } from "../types/spoofing";

export interface QuestHandlerContext {
    quest: QuestValue;
    questName: string;
    taskName: string;
    secondsNeeded: number;
    secondsDone: number;
    applicationId: string;
    applicationName: string;
    configVersion: number;
    pid: number;
    isApp: boolean;
    completingQuest: Map<any, any>;
    fakeGames: Map<any, any>;
    fakeApplications: Map<any, any>;
    addFakeGame: (questId: string, game: any) => void;
    removeFakeGame: (questId: string) => boolean;
    addFakeApplication: (questId: string, app: any) => void;
    removeFakeApplication: (questId: string) => boolean;
    RestAPI: any;
    FluxDispatcher: any;
    RunningGameStore?: any;
    ChannelStore: any;
    GuildChannelStore: any;
    getSpoofingProfile: () => SpoofingProfile;
    onQuestComplete: () => void;
}

export interface QuestHandler {
    supports(taskName: string): boolean;
    handle(context: QuestHandlerContext): void | Promise<void>;
}
