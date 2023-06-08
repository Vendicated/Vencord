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

import { definePluginSettings } from "@api/Settings";
import { enableStyle } from "@api/Styles";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./index.css?managed";

const BASE_URL = "https://raw.githubusercontent.com/AutumnVN/usrbg/main/usrbg.json";


const settings = definePluginSettings({
    nitroFirst: {
        description: "Banner to use if both Nitro and USRBG banners are present",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro banner", value: true, default: true },
            { label: "USRBG banner", value: false },
        ]
    }
});

export default definePlugin({
    name: "USRBG",
    description: "Displays user banners from USRBG, allowing anyone to get a banner without Nitro",
    authors: [Devs.AutumnVN, Devs.pylix, Devs.TheKodeToad, Devs.ImLvna],
    settings,
    patches: [
        {
            find: ".NITRO_BANNER,",
            replacement: [
                {
                    match: /(\i)\.premiumType/,
                    replace: "$self.premiumHook($1)||$&"
                },
                {
                    match: /(\i)\.bannerSrc,/,
                    replace: "$self.useBannerHook($1),"
                },
                {
                    match: /\?\(0,\i\.jsx\)\(\i,{type:\i,shown/,
                    replace: "&&$self.shouldShowBadge(arguments[0])$&"
                }
            ]
        }
    ],


    data: {} as Record<string, string>,
    nitroData: {} as Record<string, string>,

    settingsAboutComponent: () => {
        return (
            <Link href="https://github.com/AutumnVN/usrbg#how-to-request-your-own-usrbg-banner">CLICK HERE TO GET YOUR OWN BANNER</Link>
        );
    },

    useBannerHook({ displayProfile, user }: any) {
        if (displayProfile?.banner) {
            // Usrbg stores this instead of memberBanners so they arent overwriting the same thing
            this.nitroData[user.id] = displayProfile.getBannerURL({ "canAnimate": true });
            if (settings.store.nitroFirst) return;
        }
        if (this.data[user.id]) return this.data[user.id];
    },

    premiumHook({ userId }: any) {
        if (this.data[userId]) return 2;
    },

    shouldShowBadge({ displayProfile, user }: any) {
        return displayProfile?.banner && (!this.data[user.id] || settings.store.nitroFirst);
    },

    async start() {
        enableStyle(style);

        const res = await fetch(BASE_URL);
        if (res.ok)
            this.data = await res.json();
    }
});
