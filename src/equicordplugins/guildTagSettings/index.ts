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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import clanBadges from "../_misc/clanBadges.css?managed";

const settings = definePluginSettings({
    hideTags: {
        type: OptionType.BOOLEAN,
        description: "Hide tags",
        default: false,
        onChange: value => {
            if (value) enableStyle(clanBadges);
            else disableStyle(clanBadges);
        }
    },
    disableAdoptTagPrompt: {
        type: OptionType.BOOLEAN,
        description: "Disable the prompt to adopt tags",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "GuildTagSettings",
    description: "Settings for Guild Tags",
    authors: [Devs.thororen],
    settings,
    patches: [
        {
            find: "GuildTagCoachmark",
            replacement: {
                match: /return.{0,100}shouldShow/g,
                replace: "return null;$&"
            },
            predicate: () => settings.store.disableAdoptTagPrompt
        }
    ],
    start() {
        if (settings.store.hideTags) enableStyle(clanBadges);
    },
    stop() {
        if (settings.store.hideTags) disableStyle(clanBadges);
    }
});
