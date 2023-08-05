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

import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { NavigationRouter } from "@webpack/common";
import { Settings } from "Vencord";
import { Message } from "discord-types/general";
const Kangaroo = findByPropsLazy("jumpToMessage");
interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
    guildId: string;
}

const thegoddamnpingsound =
    "https://cdn.discordapp.com/attachments/1015060231060983891/1137445506151350422/literallythefuckingpingsoundbecauseihavenoideahowtomakethesound.mp3";


function ping() {
    if (!document.hasFocus()) return;
    new Audio(thegoddamnpingsound).play();
}



export default definePlugin({
    name: "keywordPinger",
    authors: [Devs.echo],

    description: "lets you choose keywords to get pinged for when they are sent in any chat",
    options: {
        keywords: {
            description: "split the keywords with `,` example: \"amongus,balls\"",
            type: OptionType.STRING,
            default: "",
            restartNeeded: false,
        }
    },
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId, guildId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            let keywordarray = Settings.plugins.keywordPinger.keywords.replaceall(" ", "").toLowerCase().split(",");
            for (let i = 0; i < keywordarray.length; i++) {
                const element = keywordarray[i];
                if (message.content.toLowerCase().match(new RegExp("\\b" + element + "\\b"))) {
                    let messageId = message.id;
                    showNotification({
                        title: `someone said ${element}`,
                        body: `Click here to view the ${element}`,
                        onClick() {
                            NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}`);
                            Kangaroo.jumpToMessage({
                                channelId,
                                messageId,
                                flash: true,
                                jumpType: "INSTANT"
                            });
                        }
                    });
                    console.log(guildId, channelId);
                    ping();
                }
            }

        },
    }
});


