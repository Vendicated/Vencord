/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";
import type { Channel, Message } from "discord-types/general";
import { Logger } from "@utils/Logger";

const MuteStore = findByPropsLazy("isSuppressEveryoneEnabled");
const XSLog = new Logger("XSOverlay");

const enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3
}

const settings = definePluginSettings({
    timeout: {
        type: OptionType.NUMBER,
        description: "Notif duration (secs)",
        default: 1.0,
    },
    opacity: {
        type: OptionType.SLIDER,
        description: "Notif opacity",
        default: 1,
        markers: makeRange(0, 1, 0.1)
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Volume",
        default: 0.5,
        markers: makeRange(0, 1, 0.1)
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Ignore messages from bots",
        default: false
    },
    pingColor: {
        type: OptionType.STRING,
        description: "User mention color",
        default: "#7289DA"
    },
    channelPingColor: {
        type: OptionType.STRING,
        description: "Channel mention color",
        default: "#8a2be2"
    }
});

export default definePlugin({
    name: "XSOverlay",
    description: "Forwards Discord notifications to XSOverlay, for easy viewing in VR",
    authors: [Devs.Nyako],
    tags: ["vr", "notify"],
    settings,
    flux: {
        MESSAGE_CREATE({ message }: { message: Message; }) {
            // Apparently without this try/catch, discord's socket connection dies if any part of this errors
            try {
                const channel = ChannelStore.getChannel(message.channel_id);
                if (!shouldNotify(message, channel)) return;

                const pingColor = settings.store.pingColor.replaceAll("#", "").trim();
                const channelPingColor = settings.store.channelPingColor.replaceAll("#", "").trim();
                let finalMsg = message.content;
                let titleString = "";

                if (channel.guild_id) {
                    const guild = GuildStore.getGuild(channel.guild_id);
                    titleString = `${message.author.username} (${guild.name}, #${channel.name})`;
                }

                switch (channel.type) {
                    case ChannelTypes.DM:
                        titleString = message.author.username;
                        break;
                    case ChannelTypes.GROUP_DM:
                        let channelName = channel.name.trim() ?? channel.rawRecipients.map(e => e.username).join(", ");
                        titleString = `${message.author.username} (${channelName})`;
                        break;
                }


                if (message.call) {
                    finalMsg = "is calling you";
                }


                if (message.embeds.length) {
                    finalMsg += " [embed] ";
                    if (message.content === "") {
                        finalMsg = "sent message embed(s)";
                    }
                }

                // sticker items is weird it might need to be sticker_items again and tsignored
                if (message.stickerItems) {
                    finalMsg += " [sticker] ";
                    if (message.content === "") {
                        finalMsg = "sent a sticker";
                    }
                }

                const images = message.attachments.filter(e =>
                    typeof e?.content_type === "string"
                    && e?.content_type.startsWith("image")
                );


                images.forEach(img => {
                    finalMsg += ` [image: ${img.filename}] `;
                });

                message.attachments.filter(a => a && !a.content_type?.startsWith("image")).forEach(a => {
                    finalMsg += ` [attachment: ${a.filename}] `;
                });

                // make mentions readable
                for (const _ of message.mentions) {
                    finalMsg = finalMsg.replace(/<@!?(\d{17,20})>/g, (_, id) => `<color=#${pingColor}><b>@${UserStore.getUser(id)?.username || "unknown-user"}</color></b>`);
                }
                if (message.mentionRoles?.length > 0) {
                    for (const _ of message.mentionRoles) {
                        finalMsg = finalMsg.replace(/<@&(\d{17,20})>/g, (_, role) => `<b><color=#${role.color.toString(16)}>@${role.name}</color></b>`);
                    }
                }

                // make emotes and channel mentions readable
                const emoteMatches = finalMsg.match(new RegExp("(<a?:\\w+:\\d+>)", "g"));
                const channelMatches = finalMsg.match(new RegExp("<(#\\d+)>", "g"));

                if (emoteMatches) {
                    for (const eMatch of emoteMatches) {
                        finalMsg = finalMsg.replace(new RegExp(`${eMatch}`, "g"), `:${eMatch.split(":")[1]}:`);
                    }
                }

                if (channelMatches) {
                    for (const cMatch of channelMatches) {
                        let channelId = cMatch.split("<#")[1];
                        channelId = channelId.substring(0, channelId.length - 1);
                        finalMsg = finalMsg.replace(new RegExp(`${cMatch}`, "g"), `<b><color=#${channelPingColor}>#${ChannelStore.getChannel(channelId).name}</color></b>`);
                    }
                }

                sendNotif(titleString, finalMsg, message);
            } catch (err) {
                XSLog.error(`Failed to catch MESSAGE_CREATE: ${err}`);
            }
        }
    }
});

function sendNotif(titleString: string, content: string, message: Message) {
    fetch(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=128`).then(response => response.arrayBuffer()).then(result => {
        const msgData = {
            messageType: 1,
            index: 0,
            timeout: settings.store.timeout,
            height: calculateHeight(cleanMessage(content)),
            opacity: settings.store.opacity,
            volume: settings.store.volume,
            audioPath: "default",
            title: titleString,
            content: content,
            useBase64Icon: true,
            icon: result,
            sourceApp: "Vencord"
        };
        VencordNative.pluginHelpers.XSOverlay.send(msgData);
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

function cleanMessage(content: string) {
    return content.replace(new RegExp("<[^>]*>", "g"), "");
}
