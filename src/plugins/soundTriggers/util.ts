/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Toasts } from "@webpack/common";

import { SoundTrigger } from ".";

type SoundTriggerValidationSuccess = {
    error: false;
    formattedTrigger: SoundTrigger;
};

type SoundTriggerValidationFailure = {
    error: true;
    message: string;
};

type SoundTriggerValidationResult = SoundTriggerValidationSuccess | SoundTriggerValidationFailure;

export const validateAndFormatTrigger = (trigger: SoundTrigger): SoundTriggerValidationResult => {
    const formattedSound = trigger.sound.trim();

    if (trigger.patterns.some(p => p.trim() === "")) {
        return {
            error: true,
            message: "Error: Patterns must have at least one non-space character.",
        };
    }
    if (!patternsAreUnique(trigger.patterns)) {
        return {
            error: true,
            message: "Error: Duplicate patterns defined."
        };
    }
    if (formattedSound === "") {
        return {
            error: true,
            message: "Error: Sound URLs cannot be empty."
        };
    }
    return {
        error: false,
        formattedTrigger: {
            ...trigger,
            sound: formattedSound,
        }
    };
};

export const triggersEqual = (triggerOne: SoundTrigger, triggerTwo: SoundTrigger) => {
    const patternsOne = triggerOne.patterns.toSorted();
    const patternsTwo = triggerTwo.patterns.toSorted();
    const matchingPatterns = patternsOne.length === patternsTwo.length && patternsOne.every((p, i) => patternsTwo[i] === p);
    return matchingPatterns && triggerOne.sound === triggerTwo.sound;
};

const patternsAreUnique = (patterns: string[]) => {
    return patterns.every((p, i) => patterns.indexOf(p) === i);
};

export const triggersAreUnique = (triggers: SoundTrigger[]) => {
    return getUniqueTriggers(triggers).length === triggers.length;
};

export const getUniqueTriggers = (triggers: SoundTrigger[]) => {
    return triggers.filter((t, i, a) => a.findIndex(t1 => triggersEqual(t, t1)) === i);
};

export const failToast = (message: string) => {
    Toasts.show({
        id: Toasts.genId(),
        message,
        type: Toasts.Type.FAILURE
    });
};

export const successToast = (message: string) => {
    Toasts.show({
        id: Toasts.genId(),
        message,
        type: Toasts.Type.SUCCESS
    });
};
