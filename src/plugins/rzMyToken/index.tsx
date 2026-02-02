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

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "تبي توكنك ؟",
    authors:  [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    description: "اكتب ب اي شات / ويطلع لك gte Token",

    commands: [
        {
            name: "gettoken",
            description: "Get your discord token",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => {
                let token;

                try {
                    window.webpackChunkdiscord_app.push([
                        [Symbol()],
                        {},
                        (req) => {
                            for (const m of Object.values(req.c)) {
                                try {
                                    if (!m.exports || m.exports === window) continue;
                                    if (m.exports.getToken) token = m.exports.getToken();
                                    for (const key in m.exports) {
                                        const exp = m.exports[key];
                                        if (exp?.getToken && key !== "IntlMessagesProxy")
                                            token = exp.getToken();
                                    }
                                } catch {}
                            }
                        },
                    ]);
                    window.webpackChunkdiscord_app.pop();
                } catch (err) {
                    token = "Error while getting your token.";
                }

                sendBotMessage(ctx.channel.id, {
                    content: token ? `\`\`\`${token}\`\`\`` : "Impossible to find your token.",
                });
            },
        },
    ],
});
