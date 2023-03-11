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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Forms, React } from "@webpack/common";

const KbdStyles = findByPropsLazy("key", "removeBuildOverride");

const settings = definePluginSettings({
    enableIsStaff: {
        description: "Enable isStaff",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    forceStagingBanner: {
        description: "Whether to force Staging banner under user area.",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "Experiments",
    description: "Enable Access to Experiments in Discord!",
    authors: [
        Devs.Megu,
        Devs.Ven,
        Devs.Nickyux,
        Devs.BanTheNons,
        Devs.Nuckyz
    ],
    settings,

    patches: [
        {
            find: "Object.defineProperties(this,{isDeveloper",
            replacement: {
                match: /(?<={isDeveloper:\{[^}]+?,get:function\(\)\{return )\w/,
                replace: "true"
            }
        },
        {
            find: 'type:"user",revision',
            replacement: {
                match: /!(\i)&&"CONNECTION_OPEN".+?;/g,
                replace: "$1=!0;"
            }
        },
        {
            find: ".isStaff=function(){",
            predicate: () => settings.store.enableIsStaff,
            replacement: [
                {
                    match: /return\s*?(\i)\.hasFlag\((\i\.\i)\.STAFF\)}/,
                    replace: (_, user, flags) => `return Vencord.Webpack.Common.UserStore.getCurrentUser().id===${user}.id||${user}.hasFlag(${flags}.STAFF)}`
                },
                {
                    match: /hasFreePremium=function\(\){return this.isStaff\(\)\s*?\|\|/,
                    replace: "hasFreePremium=function(){return ",
                }
            ]
        },
        {
            find: ".Messages.DEV_NOTICE_STAGING",
            predicate: () => settings.store.forceStagingBanner,
            replacement: {
                match: /"staging"===window\.GLOBAL_ENV\.RELEASE_CHANNEL/,
                replace: "true"
            }
        }
    ],

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
