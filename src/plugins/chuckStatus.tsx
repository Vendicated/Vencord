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

import { getSettingStoreLazy } from "@api/SettingsStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const CustomStatus = getSettingStoreLazy("status", "customStatus");
const setCustomStatus = (message: string) => CustomStatus?.updateSetting({ text: message, expiresAtMs: "0" });

async function getFact() {
    try {
        const response = await fetch("https://api.chucknorris.io/jokes/random");
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error("Error getting Chuck Norris Fact:", error);
    }
}

async function changeStatus() {
    const fact = await getFact();
    setCustomStatus(fact);
    console.log("Changed Status to:", fact);
}

export default definePlugin({
    name: "Chuck Status",
    description: "Every time you startup/restart Discord your status will be changed to a random Chuck Norris fact.",
    authors: [Devs.Wuemeli],

    start() {
        changeStatus();
    },
    stop() {
        setCustomStatus(":)");
    },
});
