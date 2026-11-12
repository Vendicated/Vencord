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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ComponentDispatch, MessageStore,UserStore } from "@webpack/common";

const PendingReplyStore = findStoreLazy("PendingReplyStore");

export default definePlugin({
    name: "TargetedMessageActions",
    description: "Makes s/search/replace and +:emoji: invoke on the message you're replying to",
    authors: [Devs.scattagain],

    patches: [
        {
            find: "searchReplace",
            replacement: [
                {
                    match: /=\i\.\i\.getMessages\((\i\.id)\).last\(\);/,
                    replace: "=$self.getTargetMessage($1, false);"
                },
                {
                    match: /=\i\.\i\.getLastEditableMessage\((\i\.id)\);/,
                    replace: "=$self.getTargetMessage($1, true);"
                },
                {
                    match: /(?<=searchReplace.*return{content:"")/,
                    replace: ",_tma_notself:true"
                }
            ],
        },
        {
            find: "handleSendMessage",
            replacement: {
                match: /(?<={channel:\i,isEdit:!1}\);)(?=null!=(\i))/,
                replace: "if ($1?._tma_notself) return {shouldClear: false, shouldRefocus: true};"
            }
        }
    ],

    getTargetMessage(channelId: string, selfOnly: boolean) {
        const latest = selfOnly ? MessageStore.getLastEditableMessage(channelId) : MessageStore.getLastMessage(channelId);
        const message = PendingReplyStore.getPendingReply(channelId)?.message || latest;
        const isSelf = message.author.id === UserStore.getCurrentUser().id;

        if (!selfOnly || isSelf) return message;
        ComponentDispatch.dispatch("SHAKE_APP", { duration: 300,intensity: 2 });
    },
});
