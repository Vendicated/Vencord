/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { SoundOverrideComponent } from "./components/SoundOverrideComponent";
import { SoundOverride, soundTypes } from "./types";

export const settings = definePluginSettings({
    overrides: {
        type: OptionType.COMPONENT,
        description: "",
        default: {},
        component: () =>
            <>{soundTypes.map(type =>
                <SoundOverrideComponent
                    type={type}
                    override={
                        settings.store.overrides[type.id] ??= {
                            enabled: false,
                            url: "",
                            volume: 100
                        }
                    }
                />
            )}</>
    }
});

export function findOverride(id: string): SoundOverride | null {
    const result = settings.store.overrides[id];
    if (!result?.enabled)
        return null;

    return result;
}
