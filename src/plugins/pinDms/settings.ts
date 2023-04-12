/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Settings, useSettings } from "@api/settings";

let snapshotArray: string[] | undefined;
let snapshot: Set<string> | undefined;

const getArray = () => (Settings.plugins.PinDMs.pinnedDMs || void 0)?.split(",") as string[] | undefined;
const save = (pins: string[]) => {
    snapshot = void 0;
    Settings.plugins.PinDMs.pinnedDMs = pins.join(",");
};
const takeSnapshot = () => {
    snapshotArray = getArray();
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

export function getPinAt(idx: number) {
    requireSnapshot();
    return snapshotArray![idx];
}

export function movePin(element: string, target: string) {
    const pins = getArray()!;
    pins.splice(pins.indexOf(element), 1);
    pins.splice(pins.indexOf(target) + 1, 0, element);
    save(pins);
}
