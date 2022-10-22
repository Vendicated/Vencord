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

import { lazyWebpack } from "../utils";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { filters } from "../webpack";
import { Forms, React } from "../webpack/common";

const KbdStyles = lazyWebpack(filters.byProps(["key", "removeBuildOverride"]));

export default definePlugin({
    name: "Experiments",
    authors: [
        Devs.Megu,
        Devs.Ven,
        { name: "Nickyux", id: 427146305651998721n },
        { name: "BanTheNons", id: 460478012794863637n },
    ],
    description: "Enable Access to Experiments in Discord!",
    patches: [{
        find: "Object.defineProperties(this,{isDeveloper",
        replacement: {
            match: /(?<={isDeveloper:\{[^}]+,get:function\(\)\{return )\w/,
            replace: "true"
        },
    }, {
        find: 'type:"user",revision',
        replacement: {
            match: /(\w)\|\|"CONNECTION_OPEN".+?;/g,
            replace: "$1=!0;"
        },
    }, {
        find: ".isStaff=function(){",
        predicate: () => Settings.plugins.Experiments.enableIsStaff === true,
        replacement: [
            {
                match: /return\s*(\w+)\.hasFlag\((.+?)\.STAFF\)}/,
                replace: "return Vencord.Webpack.Common.UserStore.getCurrentUser().id===$1.id||$1.hasFlag($2.STAFF)}"
            },
            {
                match: /hasFreePremium=function\(\){return this.isStaff\(\)\s*\|\|/,
                replace: "hasFreePremium=function(){return ",
            },
        ],
    }],
    options: {
        enableIsStaff: {
            description: "Enable isStaff (requires restart)",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        }
    },

    settingsAboutComponent: () => {
        const isMacOS = navigator.platform.includes("Mac");
        const modKey = isMacOS ? "cmd" : "ctrl";
        const altKey = isMacOS ? "opt" : "alt";
        return (
            <React.Fragment>
                <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    You can enable client DevTools{" "}
                    <kbd className={KbdStyles.key}>{modKey}</kbd> +{" "}
                    <kbd className={KbdStyles.key}>{altKey}</kbd> +{" "}
                    <kbd className={KbdStyles.key}>O</kbd>{" "}
                    after enabling <code>isStaff</code> below
                </Forms.FormText>
                <Forms.FormText>
                    and then toggling <code>Enable DevTools</code> in the <code>Developer Options</code> tab in settings.
                </Forms.FormText>
            </React.Fragment>
        );
    }
});
