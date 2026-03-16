/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Plugin } from "@utils/types";

export interface ExtensionKeybindMap {
    secondaryActionChord: string;
    tertiaryActionChord: string;
}

export interface SilentTypingSettingsStore {
    enabledGlobally: boolean;
    defaultHidden: boolean;
    enabledLocations: string;
    disabledLocations: string;
}

export type SilentTypingPluginWithSettings = Plugin & {
    settings?: {
        store?: SilentTypingSettingsStore;
    };
};

export type RandomVoiceOperation = ">" | "<" | "==";

export interface RandomVoiceSettingsStore {
    UserAmountOperation: RandomVoiceOperation;
    UserAmount: number;
    spacesLeftOperation: RandomVoiceOperation;
    spacesLeft: number;
    vcLimitOperation: RandomVoiceOperation;
    vcLimit: number;
    Servers: string;
    autoNavigate: boolean;
    selfMute: boolean;
    selfDeafen: boolean;
    avoidStages: boolean;
    avoidAfk: boolean;
    video: boolean;
    stream: boolean;
    mute: boolean;
    deafen: boolean;
    includeStates: boolean;
    avoidStates: boolean;
}

export interface RandomVoiceStateLike {
    channelId?: string;
    selfDeaf?: boolean;
    selfMute?: boolean;
    selfStream?: boolean;
    selfVideo?: boolean;
}

export type RandomVoicePluginWithSettings = Plugin & {
    settings?: {
        store?: RandomVoiceSettingsStore;
    };
};

export type HolyNotesPlugin = Plugin & {
    toolboxActions?: Record<string, () => void | Promise<void>>;
};

export interface SilentMessageToggleSettingsStore {
    autoDisable: boolean;
}

export type SilentMessageTogglePluginWithSettings = Plugin & {
    settings?: {
        store?: SilentMessageToggleSettingsStore;
    };
};

export type ScheduledMessagesPlugin = Plugin & {
    toolboxActions?: Record<string, () => void | Promise<void>>;
};

export type ThemeLibraryPlugin = Plugin;
