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
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { useAwaiter } from "@utils/misc";
import definePlugin from "@utils/types";

import style from "./index.css?managed";

const URL = "https://raw.githubusercontent.com/AutumnVN/usrbg/main/dist/";

export default definePlugin({
    name: "USRBG",
    description: "Fake Nitro banner",
    authors: [Devs.AutumnVN, Devs.pylix],
    patches: [
        {
            find: ".bannerSrc,",
            replacement: [
                {
                    match: /(\i).bannerSrc,/,
                    replace: "$1.bannerSrc??$self.bannerHook($1.user.id),"
                }
            ]
        },
    ],

    settingsAboutComponent: () => {
        return (
            <Link href="https://github.com/Discord-Custom-Covers/usrbg#request-your-own-usrbg">Get your own banner</Link>
        );
    },

    bannerHook(userId: string) {
        const [bg] = useAwaiter(
            () => fetch(`${URL}${userId}.txt`).then(res => res.ok ? res.text() : null)
        );

        return bg || undefined;
    },

    start() {
        enableStyle(style);
    }
});
