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

import { definePluginSettings, Settings, useSettings } from "@api/settings";
import { OptionType } from "@utils/types";

let snapshot: Set<string>;

export const settings = definePluginSettings({
    showTwice: {
        type: OptionType.BOOLEAN,
        description: "Also show pinned DMs in the normal DM list",
        default: false
    }
});

const takeSnapshot = () => snapshot = new Set<string>((Settings.plugins.PinDMs.pinnedDMs || void 0)?.split(","));
const requireSnapshot = () => snapshot ?? takeSnapshot();

export function usePinnedDms() {
    useSettings(["plugins.PinDMs.pinnedDMs", "plugins.PinDMs.showTwice"]);

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

    Settings.plugins.PinDMs.pinnedDMs = [...snapshot].join(",");
}
