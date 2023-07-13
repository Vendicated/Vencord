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

import { definePluginSettings, Settings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";
import type { Channel } from "discord-types/general";
import { Webpack } from "Vencord";

import { Message } from "./whoReacted";

const MuteStore = Webpack.findByPropsLazy("isSuppressEveryoneEnabled");

const enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3
}

const settings = definePluginSettings({
    timeout: {
        type: OptionType.NUMBER,
        description: "Time in seconds the notifcation will be displayed",
        default: 5
    },
    opacity: {
        type: OptionType.SLIDER,
        description: "Opacity of the notifcation displayed",
        default: 1,
        markers: makeRange(0, 1, 0.1)
    },
});

export default definePlugin({
    name: "XSOverlay",
    description: "Sends notifications to XSOverlay to be easier to see in VR",
    authors: [Devs.Penny],
    settings,
    flux: {
        MESSAGE_CREATE({ message }: { message: Message; }) {

            const channel: Channel = ChannelStore.getChannel(message.channel_id);

            if (!shouldNotify(message, channel)) return;

            // Make title bar (Author name and channel)

            var titleString = "";

            if (channel.guild_id) {
                const guild = GuildStore.getGuild(channel.guild_id);
                titleString = `${message.author.username} (${guild.name}, #${channel.name})`;
            }

            if (channel.type === ChannelTypes.GROUP_DM) {
                titleString = `${message.author.username} (${channel.name})`;
                if (!channel.name || channel.name === " " || channel.name === "") {
                    titleString = `${message.author.username} (${channel.rawRecipients.map(e => e.username).join(", ")})`;
                }
            }

            if (channel.type === ChannelTypes.DM) {
                titleString = `${message.author.username}`;
            }

            // Make final message

            let finalMsg: string = message.content;

            if (message.call) {
                finalMsg = "Started a call a call with you!";
            }

            // TODO: Test this
            if (message.embeds.length !== 0) {
                finalMsg += " [embed] ";
                if (message.content === "") {
                    finalMsg = "[embed]";
                }
            }

            // TODO: Fix this shit
            //
            // if (message.stickers) {
            //     finalMsg += " [sticker] ";
            //     if (message.content === "") {
            //         finalMsg = "[sticker]";
            //     }
            // }

            // Collect Images
            const images = message.attachments.filter(
                e =>
                    typeof e?.content_type === "string" &&
                    e?.content_type.startsWith("image")
            );

            // Add images and attachments to message
            if (images[0]) {
                finalMsg += " [image:" + message.attachments[0].filename + "] ";
            } else if (message.attachments.length !== 0) {
                finalMsg += " [attachment:" + message.attachments[0].filename + "] ";
            }

            // Replace user and role mentions
            for (const mention of message.mentions) {
                finalMsg = finalMsg.replace(/<@!?(\d{17,20})>/g, (_, id) => `<color=#7289DA><b>@${UserStore.getUser(id)?.username || "unknown-user"}</color></b>`);
                // finalMsg = finalMsg.replace(new RegExp(`<@!?${mention.id}>`, "g"), `<color=#7289DA><b>@${mention.username}</color></b>`);
            }
            if (message.mentionRoles?.length > 0) {
                const { roles } = GuildStore.getGuild(channel.guild_id);
                for (const roleId of message.mentionRoles) {
                    const role = roles[roleId];
                    finalMsg = finalMsg.replace(/<@&(\d{17,20})>/g, (_, role) => `<b><color=#${role.color.toString(16)}>@${role.name}</color></b>`);
                    // finalMsg = finalMsg.replace(new RegExp(`<@&${roleId}>`, "g"), `<b><color=#${role.color.toString(16)}>@${role.name}</color></b>`);
                }
            }

            // Format emotes
            let matches = finalMsg.match(new RegExp("(<a?:\\w+:\\d+>)", "g"));
            if (matches) {
                for (const match of matches) {
                    finalMsg = finalMsg.replace(new RegExp(`${match}`, "g"), `:${match.split(":")[1]}:`);
                }
            }

            // Format Channels
            matches = finalMsg.match(new RegExp("<(#\\d+)>", "g"));
            if (matches) {
                for (const match2 of matches) {
                    let channelId = match2.split("<#")[1];
                    channelId = channelId.substring(0, channelId.length - 1);
                    finalMsg = finalMsg.replace(new RegExp(`${match2}`, "g"), `<b><color=#8a2be2>#${ChannelStore.getChannel(channelId).name}</color></b>`);
                }
            }

            sendNotif(titleString, finalMsg, message);
        }
    }
});

function sendNotif(titleString: string, finalMsg: string, message: Message) {
    fetch(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=128`).then(response => response.arrayBuffer()).then(result => {
        const data = {
            messageType: 1,
            index: 0,
            timeout: Settings.plugins.XSOverlay.timeout,
            height: calculateHeight(clearMessage(finalMsg)),
            opacity: Settings.plugins.XSOverlay.opacity,
            volume: 0,
            audioPath: "",
            title: titleString,
            content: finalMsg,
            useBase64Icon: true,
            icon: result,
            sourceApp: "Vencord"
        };

        VencordNative.pluginHelpers.XSOverlay.send(data);
    });
}

function shouldNotify(message: Message, channel: Channel) {
    if (message.author.id === UserStore.getCurrentUser().id) return false;
    if (MuteStore.allowAllMessages(channel)) return true;

    return message.mentioned;
}

function calculateHeight(content: string) {
    if (content.length <= 100) return 100;
    if (content.length <= 200) return 150;
    if (content.length <= 300) return 200;
    return 250;
}

function clearMessage(content: string) {
    return content.replace(new RegExp("<[^>]*>", "g"), "");
}
