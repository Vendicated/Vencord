/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

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
export const DEFAULT_SETTINGS = [EMPTY_TRIGGER];

export const classFactory = classNameFactory("vc-st-");

type SoundTriggerMatch = SoundTrigger & {
    index: number;
};

const findAndPlayTriggers = async (message: string) => {
    const triggers = (settings.store.soundTriggers as SoundTrigger[])
        .flatMap(trigger => {
            const flags = trigger.caseSensitive ? "g" : "gi";
            const regex = new RegExp(trigger.patterns.join("|"), flags);
            return [...message.matchAll(regex)].map(m => ({ ...trigger, index: m.index }));
        })
        .filter((t): t is SoundTriggerMatch => t.index !== undefined)
        .toSorted((t, u) => t.index - u.index);

    try {
        for (const trigger of triggers) {
            await playTrigger(trigger);
        }
    } catch (e) {
        new Logger("SoundTrigger").error(e);
    }
};

const playTrigger = async (trigger: SoundTrigger): Promise<void> => {
    return new Promise((resolve, reject) => {
        const audio = document.createElement("audio");
        audio.src = trigger.sound;
        audio.volume = trigger.volume;
        audio.onended = () => resolve();
        audio.onerror = () => reject();
        audio.play();
    });
};

export const settings = definePluginSettings({
    soundTriggers: {
        type: OptionType.COMPONENT,
        component: SoundTriggerSettings,
        description: "",
    }
});

export default definePlugin({
    name: "!SoundTriggers",
    description: "chaos!!!",
    authors: [Devs.battlesqui_d],
    settings,
    start() {
        if (settings.store.soundTriggers) {
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
