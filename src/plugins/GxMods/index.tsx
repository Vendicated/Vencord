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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Text } from "@webpack/common";

import { getCrxLink, getModInfo } from "./api/api";


// Anime mod
const modId = "605a8f04-f91b-4f94-8e33-94f4c56e3b05";

export default definePlugin({
    name: "GxMods",
    description: "Integrates OperaGX Mods into discord.",
    authors: [Devs.Arjix],

    settingsAboutComponent: () => {
        return <Text>Integrates OperaGX Mods into discord. (
            <a onClick={e => {
                e.preventDefault();
                VencordNative.native.openExternal("https://store.gx.me");
                return false;
            }} href="https://store.gx.me"
            >https://store.gx.me</a>)</Text>;
    },

    async start() {
        const modInfo = await getModInfo(modId);
        const crxLink = await getCrxLink(modInfo.data.crxId);

        console.log("GxMods", crxLink);
    },
    stop() { },
});
