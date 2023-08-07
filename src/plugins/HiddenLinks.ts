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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

// Credit to Sparkster for helping me with this!

const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");
const PendingReplyStore = findByPropsLazy("getPendingReply");

// Function to wrap the hidden link in angle brackets. Example: "<https://example.com>"
// This is to prevent Discord from automatically turning the link into an embed.

function wrapLink(link) {
    // If the link is already wrapped, return it as is.
    if (link.startsWith("<") && link.endsWith(">")) return link;
    // Remove any spaces from the link.
    link = link.replace(/\s/g, "");
    // If the link doesn't start with "http" or "https" add "https://" by default.
    if (!link.startsWith("http")) link = "https://" + link;
    return `<${link}>`;
}

function sendMessage(channelId, message) {
    message = {
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    };
    const reply = PendingReplyStore.getPendingReply(channelId);
    MessageCreator.sendMessage(channelId, message, void 0, MessageCreator.getSendMessageOptionsForReply(reply))
        .then(() => {
            if (reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            }
        });
}


function createHiddenLink(HiddenLink: string, RealLink: string) {
    HiddenLink = wrapLink(HiddenLink); // Wrap the hidden link.
    var spoilerString: string = "  ||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​|| _ _ _ _ _ _";
    return `${HiddenLink}${spoilerString}${RealLink}`;

}

export default definePlugin({
    name: "HiddenLink",
    description: "Send one link disguised as another! Prank your friends with fake embeds on links!",
    authors: [{
        id: 1095427026413965364n,
        name: "VilariStorms"
    }],
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "hiddenlink",
        description: "Send one link disguised as another!",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "Fake",
            description: "Link to disguise as",
            type: ApplicationCommandOptionType.STRING,
            required: true
        }, {
            name: "Real",
            description: "Link to send",
            type: ApplicationCommandOptionType.STRING,
            required: true

        }],
        execute: async (_, ctx) => {
            var HiddenLink: string = findOption(_, "Fake", "");
            var RealLink: string = findOption(_, "Real", "");
            sendMessage(ctx.channel.id, {
                content: createHiddenLink(HiddenLink, RealLink)
            });
        }
    }]
});
