/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings, useSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";

export const enum PinOrder {
    LastMessage,
    Custom
}

export const settings = definePluginSettings({
    pinOrder: {
        type: OptionType.SELECT,
        description: "Which order should pinned DMs be displayed in?",
        options: [
            { label: "Most recent message", value: PinOrder.LastMessage, default: true },
            { label: "Custom (right click channels to reorder)", value: PinOrder.Custom }
        ]
    }
});

const PrivateChannelSortStore = findStoreLazy("PrivateChannelSortStore");

export let snapshotArray: string[];
let snapshot: Set<string> | undefined;

const getArray = () => (Settings.plugins.PinDMs.pinnedDMs || void 0)?.split(",") as string[] | undefined;
const save = (pins: string[]) => {
    snapshot = void 0;
    Settings.plugins.PinDMs.pinnedDMs = pins.join(",");
};
const takeSnapshot = () => {
    snapshotArray = getArray() ?? [];
    return snapshot = new Set<string>(snapshotArray);
};
const requireSnapshot = () => snapshot ?? takeSnapshot();

export function usePinnedDms() {
    useSettings(["plugins.PinDMs.pinnedDMs"]);

    return requireSnapshot();
}

export function isPinned(id: string) {
    return requireSnapshot().has(id);
}

export function togglePin(id: string) {
    const snapshot = requireSnapshot();
    if (!snapshot.delete(id)) {
        snapshot.add(id);
    }

    save([...snapshot]);
}

export function sortedSnapshot() {
    requireSnapshot();
    if (settings.store.pinOrder === PinOrder.LastMessage)
        return PrivateChannelSortStore.getPrivateChannelIds().filter(isPinned);

    return snapshotArray;
}

export function getPinAt(idx: number) {
    return sortedSnapshot()[idx];
}

export function movePin(id: string, direction: -1 | 1) {
    const pins = getArray()!;
    const a = pins.indexOf(id);
    const b = a + direction;

    [pins[a], pins[b]] = [pins[b], pins[a]];

    save(pins);
}
