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

import "./index.css";

import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";

const URL = "https://raw.githubusercontent.com/Discord-Custom-Covers/usrbg/master/dist/usrbg.json";

const userBg: {} = {};

export default definePlugin({
    name: "USRBG",
    description: "Fake Nitro banner",
    authors: [Devs.AutumnVN],
    patches: [
        {
            find: "getBannerURL=",
            replacement: {
                match: /banner:(this\.banner)/,
                replace: "banner:$self.bannerHook($1,this)"
            }
        },
        {
            find: "getBannerURL=",
            replacement: {
                match: /userId,banner:(this\.banner)/,
                replace: "userId,banner:$self.bannerHook($1,this)"
            }
        },
        {
            find: "concat(window.GLOBAL_ENV.API_ENDPOINT).concat(e)",
            replacement: {
                match: /var \i=e.id,\i=e.banner,\i=e.canAnimate/,
                replace: "if(e.banner?.startsWith(\"https://\"))return e.banner;$&"
            }
        }
    ],

    settingsAboutComponent: () => {
        return (
            <>
                <Forms.FormText>Join <Link href="https://discord.gg/TeRQEPb">Discord server</Link> to get your own banner</Forms.FormText>
            </>
        );
    },

    bannerHook(banner: string, user: any) {
        const bg = userBg[user.userId];
        if (bg) banner = bg;
        return banner;
    },

    start() {
        updateBg(URL);

    }
});

function updateBg(URL: string) {
    fetch(URL)
        .then(res => res.json())
        .then(data => {
            for (const i of data) {
                userBg[i.uid] = i.img;
            }
        });
}
