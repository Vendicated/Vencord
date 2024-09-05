/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MessageJSON } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, type PluginNative, ReporterTestable } from "@utils/types";
import { type ChannelRecord, ChannelType } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { Button, ChannelStore, GuildStore, UserStore } from "@webpack/common";

interface Call {
    channel_id: string;
    guild_id: string;
    message_id: string;
    region: string;
    ringing?: string[];
}

interface ApiObject {
    sender: string;
    target: string;
    command: string;
    jsonData: string;
    rawData: string | null;
}

interface NotificationObject {
    type: number;
    timeout: number;
    height: number;
    opacity: number;
    volume: number;
    audioPath: string;
    title: string;
    content: string;
    useBase64Icon: boolean;
    icon: string;
    sourceApp: string;
}

const pingDefaultColor = "7289da";
const channelPingDefaultColor = "8a2be2";
const colorRE = /[0-9A-Za-z]{8}|[0-9A-Za-z]{6}/;
const isValid = (color: string) => colorRE.test(color);

const settings = definePluginSettings({
    webSocketPort: {
        type: OptionType.NUMBER,
        description: "Websocket port",
        default: 42070,
        onChange() {
            start();
        }
    },
    preferUDP: {
        type: OptionType.BOOLEAN,
        description: "Enable if you use an older build of XSOverlay unable to connect through websockets. This setting is ignored on web.",
        default: false,
        disabled: () => IS_WEB
    },
    botNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow bot notifications",
        default: false
    },
    serverNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow server notifications",
        default: true
    },
    dmNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow Direct Message notifications",
        default: true
    },
    groupDmNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow Group DM notifications",
        default: true
    },
    callNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow call notifications",
        default: true
    },
    pingColor: {
        type: OptionType.STRING,
        description: "User mention color",
        default: "#" + pingDefaultColor,
        isValid
    },
    channelPingColor: {
        type: OptionType.STRING,
        description: "Channel mention color",
        default: "#" + channelPingDefaultColor,
        isValid
    },
    soundPath: {
        type: OptionType.STRING,
        description: "Notification sound (default/warning/error)",
        default: "default"
    },
    timeout: {
        type: OptionType.NUMBER,
        description: "Notification duration (secs)",
        default: 3,
    },
    lengthBasedTimeout: {
        type: OptionType.BOOLEAN,
        description: "Extend duration with message length",
        default: true
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
        default: 0.2,
        markers: makeRange(0, 1, 0.1)
    },
});

let socket: WebSocket | undefined;

function start() {
    socket?.close();
    socket = new WebSocket(`ws://127.0.0.1:${settings.store.webSocketPort}/?client=Vencord`);
    return new Promise((resolve, reject) => {
        socket!.onopen = resolve;
        socket!.onerror = reject;
        setTimeout(reject, 3000);
    });
}

const Native = VencordNative.pluginHelpers.XSOverlay as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "XSOverlay",
    description: "Forwards discord notifications to XSOverlay, for easy viewing in VR",
    authors: [Devs.Nyako],
    tags: ["vr", "notify"],
    reporterTestable: ReporterTestable.None,
    settings,

    flux: {
        CALL_UPDATE({ call }: { call?: Call; }) {
            if (call?.ringing?.includes(UserStore.getCurrentUser()!.id) && settings.store.callNotifications) {
                const channel = ChannelStore.getChannel(call.channel_id)!;
                sendOtherNotif("Incoming call", `${channel.name} is calling you...`);
            }
        },
        MESSAGE_CREATE({ message, optimistic }: { message: MessageJSON; optimistic: boolean; }) {
            if (optimistic) return;
            const channel = ChannelStore.getChannel(message.channel_id)!;
            if (
                shouldIgnoreForChannelType(channel) ||
                !shouldNotify(message, message.channel_id)
            ) return;

            let finalMsg = message.content;
            let titleString = "";

            if (channel.guild_id) {
                const guild = GuildStore.getGuild(channel.guild_id)!;
                titleString = `${message.author.username} (${guild.name}, #${channel.name})`;
            }

            switch (channel.type) {
                case ChannelType.DM:
                    titleString = message.author.username.trim();
                    break;
                case ChannelType.GROUP_DM:
                    const channelName = channel.name.trim();
                    titleString = `${message.author.username} (${channelName})`;
                    break;
            }

            if (message.referenced_message)
                titleString += " (reply)";

            if (message.embeds.length > 0) {
                finalMsg += " [embed] ";
                if (message.content === "")
                    finalMsg = "sent message embed(s)";
            }

            if (message.sticker_items) {
                finalMsg += " [sticker] ";
                if (message.content === "")
                    finalMsg = "sent a sticker";
            }

            let images = "";
            let attachments = "";
            for (const a of message.attachments) {
                if (a.content_type?.startsWith("image"))
                    images += ` [image: ${a.filename}] `;
                else
                    attachments += ` [attachment: ${a.filename}] `;
            }
            finalMsg += images + attachments;


            const pingColor = settings.store.pingColor.match(colorRE)?.[0] ?? pingDefaultColor;

            // make user mentions readable
            if (message.mentions.length > 0)
                finalMsg = finalMsg.replace(
                    /(?<=<@!?)\d{17,20}(?=>)/g,
                    id => `<color=#${pingColor}><b>@${UserStore.getUser(id)?.username || "unknown-user"}</color></b>`
                );

            // color role mentions (unity styling btw lol)
            for (const roleId of message.mention_roles) {
                const role = channel.guild_id && GuildStore.getRole(channel.guild_id, roleId);
                if (!role) continue;
                const roleColor = role.colorString ?? `#${pingColor}`;
                finalMsg = finalMsg.replace(`<@&${roleId}>`, `<b><color=${roleColor}>@${role.name}</color></b>`);
            }

            // make emoji mentions readable
            finalMsg = finalMsg.replaceAll(/<a?(:\w+:)\d+>/g, "$1");

            // make channel mentions readable
            // color channel mentions
            const channelPingColor = settings.store.channelPingColor.match(colorRE)?.[0] ?? channelPingDefaultColor;
            finalMsg = finalMsg.replaceAll(
                /<#(\d+)>/g,
                id => `<b><color=#${channelPingColor}>#${ChannelStore.getChannel(id)?.name || "unknown-channel"}</color></b>`
            );

            sendMsgNotif(titleString, finalMsg, message);
        }
    },

    start,

    stop() {
        socket?.close();
    },

    settingsAboutComponent: () => (
        <Button onClick={() => { sendOtherNotif("This is a test notification! explode", "Hello from Vendor!"); }}>
            Send test notification
        </Button>
    )
});

function shouldIgnoreForChannelType(channel: ChannelRecord) {
    if (channel.isDM() && settings.store.dmNotifications) return false;
    if (channel.isGroupDM() && settings.store.groupDmNotifications) return false;
    return !settings.store.serverNotifications;
}

async function sendMsgNotif(titleString: string, content: string, message: MessageJSON) {
    const blob = await (await fetch(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=128`)).blob();
    const result = await new Promise<string>(resolve => {
        const r = new FileReader();
        r.onload = () => { resolve((r.result as string).split(",", 2)[1]!); };
        r.readAsDataURL(blob);
    });

    sendToOverlay({
        type: 1,
        timeout: settings.store.lengthBasedTimeout ? calculateTimeout(content) : settings.store.timeout,
        height: calculateHeight(content),
        opacity: settings.store.opacity,
        volume: settings.store.volume,
        audioPath: settings.store.soundPath,
        title: titleString,
        content: content,
        useBase64Icon: true,
        icon: result,
        sourceApp: "Vencord"
    });
}

function sendOtherNotif(content: string, titleString: string) {
    sendToOverlay({
        type: 1,
        timeout: settings.store.lengthBasedTimeout ? calculateTimeout(content) : settings.store.timeout,
        height: calculateHeight(content),
        opacity: settings.store.opacity,
        volume: settings.store.volume,
        audioPath: settings.store.soundPath,
        title: titleString,
        content: content,
        useBase64Icon: false,
        icon: "default",
        sourceApp: "Vencord"
    });
}

async function sendToOverlay(notif: NotificationObject) {
    if (!IS_WEB && settings.store.preferUDP) {
        Native.sendToOverlay(notif);
        return;
    }
    if (!socket || socket.readyState !== socket.OPEN) await start();
    socket!.send(JSON.stringify({
        sender: "Vencord",
        target: "xsoverlay",
        command: "SendNotification",
        jsonData: JSON.stringify(notif),
        rawData: null
    } satisfies ApiObject));
}

// NotificationTextUtils
const $shouldNotify = findByCodeLazy(".SUPPRESS_NOTIFICATIONS))return!1");

function shouldNotify(message: MessageJSON, channel: string) {
    const currentUser = UserStore.getCurrentUser()!;
    if (message.author.id === currentUser.id) return false;
    if (message.author.bot && !settings.store.botNotifications) return false;
    return $shouldNotify(message, channel);
}

function calculateHeight(content: string) {
    if (content.length <= 100) return 100;
    if (content.length <= 200) return 150;
    if (content.length <= 300) return 200;
    return 250;
}

function calculateTimeout(content: string) {
    if (content.length <= 100) return 3;
    if (content.length <= 200) return 4;
    if (content.length <= 300) return 5;
    return 6;
}
