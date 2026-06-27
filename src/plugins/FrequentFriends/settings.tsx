/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { DataStore } from "@api/index";
import { OptionType } from "@utils/types";
import { Button, UserStore, useEffect, useState } from "@webpack/common";
import { STORE_KEY_PREFIX } from "./constants";
import type { FrequencyData } from "./types";

export const pluginCallbacks = {
    syncWithAffinities: async () => {},
    getFrequencyCache: (): Record<string, FrequencyData> => ({}),
    setFrequencyCache: (_cache: Record<string, FrequencyData>) => {},
    getLastBackup: (): Record<string, FrequencyData> | null => null,
    setLastBackup: (_backup: Record<string, FrequencyData> | null) => {},
    subscribeToBackupChanges: (_fn: () => void): (() => void) => () => {},
    subscribeToScoreChanges: (_fn: () => void): (() => void) => () => {},
};

function getCurrentStoreKey(): string {
    const user = UserStore.getCurrentUser();
    return STORE_KEY_PREFIX + (user ? user.id : "default");
}

function ResetButton() {
    return (
        <Button
            color={Button.Colors.RED}
            size={Button.Sizes.SMALL}
            onClick={async () => {
                pluginCallbacks.setLastBackup(JSON.parse(JSON.stringify(pluginCallbacks.getFrequencyCache())));
                pluginCallbacks.setFrequencyCache({});
                await DataStore.set(getCurrentStoreKey(), {}).catch(e => console.warn(e));
                await pluginCallbacks.syncWithAffinities();
            }}
        >
            Reset All Data
        </Button>
    );
}

function UndoButton() {
    const [hasBackup, setHasBackup] = useState(() => !!pluginCallbacks.getLastBackup());

    useEffect(() => pluginCallbacks.subscribeToBackupChanges(() => {
        setHasBackup(!!pluginCallbacks.getLastBackup());
    }), []);

    return (
        <Button
            color={Button.Colors.BRAND}
            size={Button.Sizes.SMALL}
            disabled={!hasBackup}
            onClick={async () => {
                const backup = pluginCallbacks.getLastBackup();
                if (!backup) return;
                pluginCallbacks.setFrequencyCache(JSON.parse(JSON.stringify(backup)));
                pluginCallbacks.setLastBackup(null);
                await DataStore.set(getCurrentStoreKey(), pluginCallbacks.getFrequencyCache()).catch(e => console.warn(e));
            }}
        >
            Undo Reset
        </Button>
    );
}

const settings = definePluginSettings({
    customLabel: {
        type: OptionType.STRING,
        description: "Custom title for the list",
        default: "Frequent Friends",
        maxLength: 30
    },
    maxFriends: {
        type: OptionType.SLIDER,
        description: "Maximum number of frequent friends to show",
        default: 5,
        markers: [3, 4, 5, 6, 7, 8, 9, 10],
        stickToMarkers: true
    },
    showOffline: {
        type: OptionType.BOOLEAN,
        description: "Show offline friends",
        default: false
    },
    ignoreAffinities: {
        type: OptionType.BOOLEAN,
        description: "Pure manual mode",
        default: false
    },
    resetData: {
        type: OptionType.COMPONENT,
        description: "Wipe all frequency and affinity data from the plugin",
        component: ResetButton
    },
    undoReset: {
        type: OptionType.COMPONENT,
        description: "Restore data if you reset by mistake",
        component: UndoButton
    }
});

export default settings;