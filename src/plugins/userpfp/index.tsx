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

import { enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import style from "./index.css?managed";

export default definePlugin({
    name: "UserPFP",
    description: "Custom animated profile pictures without Discord nitro.",
    authors: [Devs.Yeetov,Devs.ImLvna,Devs.Wolfie,Devs.Dablulite,Devs.thororen],
    settingsAboutComponent: () => {
        return (
            <div>
                <h1>About UserPFP</h1>
                <Link href="https://discord.gg/userpfp-1129784704267210844">CLICK HERE FOR YOUR PFP</Link>
                <p></p>Custom animated profile pictures without Discord nitro.</p>
            </div>
        );
    },

    async start() {
        enableStyle(style);
    }
});
