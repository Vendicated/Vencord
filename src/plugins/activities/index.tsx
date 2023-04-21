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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ActivityProps, ActivityType } from "./types";


const regex = /const \w=function\((\w)\)\{var .*?\.activities.*?.applicationStream.*?children:\[.*?null!=.*?\w\.some\(.{3}\)\?(.*?)\:null/;
const self = `Vencord.Plugins.plugins.Activities`;

export default definePlugin({
    name: "Activities",
    description: "TODO!()",
    authors: [Devs.Arjix],

    patches: [
        {
            find: "().textRuler,",
            replacement: {
                match: regex,
                replace: (m, activities, icon) => m.replace(icon, `${self}.ActivitiesComponent(${activities})`)
            }
        }
    ],

    ActivitiesComponent(props: ActivityProps) {
        console.log("ayo?", props);
        const icons = [];

        return (
            <span>
                Ω
            </span>
        );
    },
});
