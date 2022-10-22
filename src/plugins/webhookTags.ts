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

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "Webhook Tags",
    description: "Changes the bot tag to say webhook for webhooks",
    authors: [Devs.Cyn],
    patches: [
        {
            find: '.BOT=0]="BOT"',
            replacement: [
                {
                    match: /(.)\[.\.BOT=0\]="BOT";/,
                    replace: (orig, types) =>
                        `${types}[${types}.WEBHOOK=99]="WEBHOOK";${orig}`,
                },
                {
                    match: /case (.)\.BOT:default:(.)=/,
                    replace: (orig, types, text) =>
                        `case ${types}.WEBHOOK:${text}="WEBHOOK";break;${orig}`,
                },
            ],
        },
        {
            find: ".Types.ORIGINAL_POSTER",
            replacement: {
                match: /return null==(.)\?null:.\.createElement\((.)\.Z/,
                replace: (orig, type, BotTag) =>
                    `if(arguments[0].message.webhookId&&arguments[0].user.isNonUserBot()){${type}=${BotTag}.Z.Types.WEBHOOK}${orig}`,
            },
        },
    ],
});
