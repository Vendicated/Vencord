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
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";
import { Buffer } from "buffer";
import { Webpack } from "Vencord";

const MuteStore = Webpack.findByPropsLazy("isSuppressEveryoneEnabled");

const enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3
}

export default definePlugin({
    name: "XSOverlay",
    description: "Sends notifications to XSOverlay to be easier to see in VR",
    authors: [Devs.Penny],
    flux: {
        MESSAGE_CREATE({ message }) {
            var finalMsg = message.content;

            const author = UserStore.getUser(message.author.id);
            const channel = ChannelStore.getChannel(message.channel_id);
            const images = message.attachments.filter(
                e =>
                    typeof e?.content_type === "string" &&
                    e?.content_type.startsWith("image")
            );

            if (!supposedToNotify(message, channel)) return;

            var authorString = "";

            if (channel.guild_id) {
                const guild = GuildStore.getGuild(channel.guild_id);
                authorString = `${author.username} (${guild.name}, #${channel.name})`;
            }

            if (channel.type === ChannelTypes.GROUP_DM) {
                authorString = `${author.username} (${channel.name})`;
                if (!channel.name || channel.name === " " || channel.name === "") {
                    authorString = `${author.username} (${channel.rawRecipients.map(e => e.username).join(", ")})`;
                }
            }

            if (channel.type === ChannelTypes.DM) {
                authorString = `${author.username}`;
            }

            if (message.call) {
                finalMsg = "Started a call";
            }

            if (message.embeds.length !== 0) {
                finalMsg += " [embed] ";
                if (message.content === "") {
                    finalMsg = "[embed]";
                }
            }

            if (message.stickers) {
                finalMsg += " [sticker] ";
                if (message.content === "") {
                    finalMsg = "[sticker]";
                }
            }

            if (images[0]) {
                finalMsg += " [image:" + message.attachments[0].filename + "] ";
            }
            else if (message.attachments.length !== 0) {
                finalMsg += " [attachment:" + message.attachments[0].filename + "] ";
            }

            for (const mention of message.mentions) {
                finalMsg = finalMsg.replace(new RegExp(`<@!?${mention.id}>`, "g"), `<color=#8a2be2><b>@${mention.username}</color></b>`);
            }

            // if (message.mention_roles.length > 0) {
            //     const { roles } = GuildStore.getGuild(message.guild_id);
            //     for (const roleId of message.mention_roles) {
            //         const role = roles[roleId];
            //         finalMsg = finalMsg.replace(new RegExp(`<@&${roleId}>`, "g"), `<b><color=#${parseInt(role.color).toString(16)}>@${role.name}</color></b>`);
            //     }
            // }

            let matches = finalMsg.match(new RegExp("(<a?:\\w+:\\d+>)", "g"));
            if (matches) {
                for (const match of matches) {
                    finalMsg = finalMsg.replace(new RegExp(`${match}`, "g"), `:${match.split(":")[1]}:`);
                }
            }

            matches = finalMsg.match(new RegExp("<(#\\d+)>", "g"));
            if (matches) {
                for (const match2 of matches) {
                    let channelId = match2.split("<#")[1];
                    channelId = channelId.substring(0, channelId.length - 1);
                    finalMsg = finalMsg.replace(new RegExp(`${match2}`, "g"), `<b><color=#8a2be2>#${ChannelStore.getChannel(channelId).name}</color></b>`);
                }
            }

            fetch(`https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=128`).then(response => response.arrayBuffer()).then(result => {
                const data = JSON.stringify({
                    messageType: 1,
                    index: 0,
                    timeout: 5,
                    height: calculateHeight(clearMessage(finalMsg)),
                    opacity: 0.9,
                    volume: 0,
                    audioPath: "",
                    title: authorString,
                    content: finalMsg,
                    useBase64Icon: true,
                    icon: Buffer.from(result).toString("base64"),
                    sourceApp: "Discord"
                });
                VencordNative.dgramHelper.send("127.0.0.1", 42069, data);
            });
            console.log("Message sent to XSOverlay");
        }
    }
});

function supposedToNotify(message, channel) {
    if (message.author.id === UserStore.getCurrentUser().id) return false;
    if (MuteStore.allowAllMessages(channel)) return true;

    return message.mentioned;
}

function calculateHeight(content) {
    if (content.length <= 100) {
        return 100;
    } else if (content.length <= 200) {
        return 150;
    } else if (content.length <= 300) {
        return 200;
    }
    return 250;
}

function clearMessage(content) {
    return content.replace(new RegExp("<[^>]*>", "g"), "");
}
