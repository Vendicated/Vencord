/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { settings, SoundTrigger } from ".";

type SoundTriggerMatch = SoundTrigger & {
    index: number;
};

export const findAndPlayTriggers = async (message: string) => {
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
