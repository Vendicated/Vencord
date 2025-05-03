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

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms } from "@webpack/common";

import clanBadges from "../_misc/clanBadges.css?managed";

const settings = definePluginSettings({
    hideClanBadges: {
        type: OptionType.BOOLEAN,
        description: "Hide clan badges",
        default: false,
        onChange: value => {
            if (value) enableStyle(clanBadges);
            else disableStyle(clanBadges);
        }
    }
});

export default definePlugin({
    name: "EquicordHelper",
    description: "Fixes some misc issues with discord",
    authors: [EquicordDevs.thororen, EquicordDevs.nyx],
    settingsAboutComponent: () => <>
        <Forms.FormText className="plugin-warning">
            This Plugin is used for fixing misc issues with discord such as some crashes
        </Forms.FormText>
    </>,
    settings,
    required: true,
    patches: [
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
    ],
    start() {
        if (settings.store.hideClanBadges) enableStyle(clanBadges);
    },
    stop() {
        if (settings.store.hideClanBadges) disableStyle(clanBadges);
    }
});
