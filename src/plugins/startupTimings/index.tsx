/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { ClockIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import StartupTimingPage from "./StartupTimingPage";

export default definePlugin({
    name: "StartupTimings",
    description: "Adds Startup Timings to the Settings menu",
    authors: [Devs.Megu],
    start() {
        SettingsPlugin.customEntries.push({
            key: "vencord_startup_timings",
            title: "Startup Timings",
            Component: StartupTimingPage,
            Icon: ClockIcon
        });
        SettingsPlugin.settingsSectionMap.push(["VencordStartupTimings", "vencord_startup_timings"]);
    },
    stop() {
        function removeFromArray<T>(arr: T[], predicate: (e: T) => boolean) {
            const idx = arr.findIndex(predicate);
            if (idx !== -1) arr.splice(idx, 1);
        }
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "vencord_startup_timings");
        removeFromArray(SettingsPlugin.settingsSectionMap, entry => entry[1] === "vencord_startup_timings");
    },
});
