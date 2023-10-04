/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { SoundTriggerSettings } from "./components/SoundTriggerSettings";

export type SoundTrigger = {
    patterns: string[];
    sound: string;
};

export const EMPTY_TRIGGER: SoundTrigger = { patterns: [], sound: "" };
export const DEFAULT_TRIGGERS: SoundTrigger[] = [EMPTY_TRIGGER];

export const classFactory = classNameFactory("vc-es-");

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
    patches: [],
    settings,
    start() {
        if (settings.store.soundTriggers) {
            return;
        }
        settings.store.soundTriggers = DEFAULT_TRIGGERS;
    },
    stop() { },
});
