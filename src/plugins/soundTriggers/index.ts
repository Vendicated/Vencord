/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

import { findAndPlayTriggers } from "./audio";
import { SoundTriggerSettings } from "./components/SoundTriggerSettings";

interface IMessageCreate {
    type: string;
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

export type SoundTrigger = {
    patterns: string[];
    sound: string;
    volume: number;
    caseSensitive: boolean;
};

export const EMPTY_TRIGGER: SoundTrigger = { patterns: [], sound: "", volume: 0.5, caseSensitive: false };
export const DEFAULT_SETTINGS = [];

export const classFactory = classNameFactory("vc-st-");

export const settings = definePluginSettings({
    soundTriggers: {
        type: OptionType.COMPONENT,
        component: SoundTriggerSettings,
        description: "",
    }
});

export default definePlugin({
    name: "SoundTriggers",
    description: "Chaotic plugin for mapping text/emojis to sound.",
    authors: [Devs.battlesqui_d],
    settings,
    start() {
        if (Array.isArray(settings.store.soundTriggers)) {
            return;
        }
        settings.store.soundTriggers = DEFAULT_SETTINGS;
    },
    flux: {
        MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;
            findAndPlayTriggers(message.content);
        }
    }
});
