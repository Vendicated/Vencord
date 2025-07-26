/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and Megumin
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

import "@equicordplugins/_misc/styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";


export default definePlugin({
    name: "EquicordHelper",
    description: "Fixes some misc issues with discord",
    authors: [EquicordDevs.thororen, EquicordDevs.nyx, EquicordDevs.Naibuu],
    settingsAboutComponent: () => <>
        <Forms.FormText className="plugin-warning" style={{ textAlign: "left" }}>
            This plugin was created to allow us as the Equicord Team & Contributors
            to fix miscellaneous issues Discord may run into or cause.
            <br />
            This includes but is not limited to:
            <br />
            - Unknown Resolution/FPS Fixed?
            <br />
            - Whitelists all domains in CSP
        </Forms.FormText>
    </>,
    required: true,
    patches: [
        // Fixes Unknown Resolution/FPS Crashing
        {
            find: "Unknown resolution:",
            replacement: [
                {
                    match: /throw Error\("Unknown resolution: ".concat\((\i)\)\)/,
                    replace: "return $1;"
                },
                {
                    match: /throw Error\("Unknown frame rate: ".concat\((\i)\)\)/,
                    replace: "return $1;"
                }
            ]
        }
    ]
});
