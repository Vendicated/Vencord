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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    platform: {
        placeholder: "Platform",
        description: "Platform what you want to emulate",
        restartNeeded: true,
        type: OptionType.SELECT,
        options: Object.entries({
            win32: { label: "Windows (Desktop)", default: IS_DISCORD_DESKTOP },
            darwin: { label: "Mac OS (Desktop)" },
            linux: { label: "Linux (Desktop)" },
            web: { label: "Web (Browser)", default: !IS_DISCORD_DESKTOP },
            android: { label: "Android (Mobile)" },
            ios: { label: "iOS (Mobile)" },
        }).map(e => ({ ...e[1], value: e[0] }))
    }
});

export default definePlugin({
    name: "PlatformEmulator",
    description: "Trick Discord into thinking that you are using a different operating system.",
    authors: [Devs.Rawir],
    settings,
    patches: [
        {
            find: ".browser_user_agent=",
            replacement: {
                match: /(\w)={os:.{0,200}}/,
                replace: (m, varName) => `${m};$self.setProperties(${varName})`
            }
        }
    ],

    getProperties() {
        switch (settings.store.platform) {
            case "win32":
                return {
                    browser: "Discord Client",
                    os: "Windows"
                };
            case "darwin":
                return {
                    browser: "Discord Client",
                    os: "Mac OS X"
                };
            case "linux":
                return {
                    browser: "Discord Client",
                    os: "Linux"
                };
            case "web":
                return {
                    browser: "Discord Web",
                    os: "Other"
                };
            case "android":
                return {
                    browser: "Discord Android",
                    os: "Android"
                };
            case "ios":
                return {
                    browser: "Discord iOS",
                    os: "iOS"
                };
            default:
                return {};
        }
    },

    setProperties(properties: any) { Object.assign(properties, this.getProperties()); }
});
