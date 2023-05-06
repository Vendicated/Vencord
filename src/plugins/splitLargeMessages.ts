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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";
import definePlugin from "@utils/types";
import { sleep } from "@utils/misc";

const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");

export default definePlugin({
    name: "SplitLargeMessages",
    description: "Character limit annoying you? No problem!",
    authors: [Devs.Nickyux],
    dependencies: ["MessageEventsAPI"],
    patches: [
        {
            find: ".handleSendMessage=",
            replacement: {
                match: /(\i)\.failureReason;if\((.{1,20})\)/,
                replace: "$1.failureReason;if($2 && $self.continueWithError($1.failureReason))"
            }
        },
        {
            find: "type:\"MESSAGE_LENGTH_UPSELL\"",
            replacement: {
                match: /if\(\i\.length\>\i\)(.{1,100})type\:"MESSAGE_LENGTH_UPSELL"/,
                replace: "if(0==1)$1type:\"MESSAGE_LENGTH_UPSELL\""
            }
        },
    ],

    continueWithError(failureReason: string) {
        return failureReason != "MESSAGE_TOO_LONG";
    },

    async start() {
        // Check the users's nitro. If they have full nitro, set the character limit to 4000
        const nitroType = UserStore.getCurrentUser()?.premiumType;
        const characterLimit = nitroType == 2 ? 4000 : 2000;

        this.preSend = addPreSendListener((channelId, msg) => {
            if (msg.content.length < characterLimit) return;

            const textToSend: Array<string> = [];
            for (let i = characterLimit; i < msg.content.length; i += characterLimit) {
                textToSend.push(msg.content.substring(i, i + characterLimit));
            };

            msg.content = msg.content.substring(0, characterLimit);

            sleep(500).then(() => {
                textToSend.forEach(async (text) => {
                    await MessageCreator.sendMessage(channelId, {
                        content: text
                    });
                });
            });
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
