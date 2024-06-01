/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton } from "@api/ChatButtons";
import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    sendBotMessage,
} from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import { removeButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import {
    FluxDispatcher, MessageActions,
    PrivateChannelsStore, RestAPI,
    SnowflakeUtils,
    useEffect, UserStore,
    UserUtils, useState,
} from "@webpack/common";
import { Message } from "discord-types/general";

import { decryptData, encryptData, formatPemKey, generateKeys } from "./rsa-utils";
const MessageCreator = findByPropsLazy("createBotMessage");
const CloudUtils = findByPropsLazy("CloudUpload");
import { getCurrentChannel } from "@utils/discord";

let enabled;
let setEnabled;

// Interface for Message Create
interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

// Chat Bar Icon Component
const ChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    [enabled, setEnabled] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(false);

    useEffect(() => {
        const listener: SendListener = async (_, message) => {
            if (enabled) {
                const groupChannel = await DataStore.get("encryptcordChannelId");
                if (getCurrentChannel().id !== groupChannel) {
                    sendBotMessage(getCurrentChannel().id, { content: `You must be in <#${groupChannel}> to send an encrypted message!\n> If you wish to send an unencrypted message, please click the button in the chatbar.` });
                    message.content = "";
                    return;
                }
                const trimmedMessage = message.content.trim();
                await MessageActions.receiveMessage(groupChannel, await createMessage(trimmedMessage, UserStore.getCurrentUser().id, groupChannel, 0));
                const encryptcordGroupMembers = await DataStore.get("encryptcordGroupMembers");
                const dmPromises = Object.keys(encryptcordGroupMembers).map(async memberId => {
                    const groupMember = await UserUtils.getUser(memberId).catch(() => null);
                    if (!groupMember) return;
                    const encryptedMessage = await encryptData(encryptcordGroupMembers[memberId].key, trimmedMessage);
                    const encryptedMessageString = JSON.stringify(encryptedMessage);
                    await sendTempMessage(groupMember.id, encryptedMessageString, "message");
                });

                await Promise.all(dmPromises);
                message.content = "";
            }
        };

        addPreSendListener(listener);
        return () => void removePreSendListener(listener);
    }, [enabled]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Send Unencrypted Messages" : "Send Encrypted Messages"}
            onClick={async () => {
                if (await DataStore.get("encryptcordGroup") === false || (await DataStore.get("encryptcordChannelId") !== getCurrentChannel().id)) {
                    setButtonDisabled(true);
                    await sendTempMessage(getCurrentChannel().id, "", `join\`\`\`\n${await DataStore.get("encryptcordPublicKey")}\`\`\``, false);
                    sendBotMessage(getCurrentChannel().id, { content: `*Checking for any groups in this channel...*\n> If none is found, a new one will be created <t:${Math.floor(Date.now() / 1000) + 5}:R>\n> [Tip] You can do \`/encryptcord leave\` to leave a group` });
                    await sleep(5000);
                    if (await DataStore.get("encryptcordGroup") === true && (await DataStore.get("encryptcordChannelId") !== getCurrentChannel().id)) {
                        sendBotMessage(getCurrentChannel().id, { content: "*Leaving current group...*" });
                        await leave("", { channel: { id: await DataStore.get("encryptcordChannelId") } });
                    } else if (await DataStore.get("encryptcordGroup") === true) {
                        setButtonDisabled(false);
                        return;
                    }
                    await startGroup("", { channel: { id: getCurrentChannel().id } });
                }
                setEnabled(!enabled);
                setButtonDisabled(false);
            }}
            buttonProps={{
                style: {
                    transition: "transform 0.3s ease-in-out",
                    transform: `rotate(${enabled ? 0 : 15}deg)`,
                },
                disabled: buttonDisabled
            }}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 129 171"
            >
                {!enabled && <>
                    <mask id="encordBarIcon">
                    </mask>
                    <path
                        fill="currentColor"
                        d="M128.93 149.231V74.907a21.142 21.142 0 00-6.195-15.1 21.165 21.165 0 00-15.101-6.195h-1.085V40.918A40.604 40.604 0 0042.214 8.065 40.602 40.602 0 0026.28 32.318h15.972a25.164 25.164 0 0128.043-15.94 25.166 25.166 0 0120.691 24.745v12.694H22.184A21.276 21.276 0 00.89 75.111v74.325a21.27 21.27 0 0013.143 19.679 21.273 21.273 0 008.152 1.615h85.388a21.455 21.455 0 0015.083-6.357 21.453 21.453 0 006.213-15.142h.062zm-63.888-15.765a21.296 21.296 0 01-15.058-36.352 21.296 21.296 0 0136.354 15.057 21.151 21.151 0 01-21.296 21.295z"
                    />
                </>
                }
                <path
                    mask="url(#encordBarIcon)"
                    fill="currentColor"
                    d="M129.497 149.264V75.001a21.27 21.27 0 00-21.295-21.294h-3.072V41.012a41.079 41.079 0 00-1.024-8.6A40.62 40.62 0 0070.729 1.087 5.673 5.673 0 0168.886.88h-.204c-.615 0-1.23-.205-1.844-.205h-4.095A5.672 5.672 0 0060.9.881h-.204a5.672 5.672 0 00-1.843.205A40.627 40.627 0 0025.27 32.413h.205a41.092 41.092 0 00-1.024 8.6v12.694h-3.133A21.153 21.153 0 00.023 75v74.325a21.415 21.415 0 0021.296 21.294h87.231a21.336 21.336 0 0020.886-21.294l.061-.062zm-64.91-15.97a21.317 21.317 0 01-22.069-24.804 21.316 21.316 0 0142.34 3.509 21.355 21.355 0 01-20.272 21.295zm25.185-79.649H39.604V40.951a24.283 24.283 0 016.963-17.2 25.351 25.351 0 0116.79-7.78h2.663a25.31 25.31 0 0123.752 25.184v12.49z"
                />
            </svg>
        </ChatBarButton>
    );
};

// Export Plugin
export default definePlugin({
    name: "Encryptcord",
    description: "End-to-end encryption in Discord!",
    authors: [Devs.Inbestigator],
    dependencies: ["CommandsAPI"],
    patches: [
        {
            find: "executeMessageComponentInteraction:",
            replacement: {
                match: /await\s+l\.default\.post\({\s*url:\s*A\.Endpoints\.INTERACTIONS,\s*body:\s*C,\s*timeout:\s*3e3\s*},\s*t\s*=>\s*{\s*h\(T,\s*p,\s*f,\s*t\)\s*}\s*\)/,
                replace: "await $self.joinGroup(C);$&"
            }
        }
    ],
    async joinGroup(interaction) {
        const sender = await UserUtils.getUser(interaction.application_id).catch(() => null);
        if (!sender || (sender.bot === true && sender.id !== "1")) return;
        if (interaction.data.component_type !== 2) return;
        switch (interaction.data.custom_id) {
            case "removeFromSelf":
                await handleLeaving(sender.id, await DataStore.get("encryptcordGroupMembers") ?? {}, interaction.channel_id);
                await sendTempMessage(sender.id, "", "leaving");
                FluxDispatcher.dispatch({
                    type: "MESSAGE_DELETE",
                    channelId: interaction.channel_id,
                    id: interaction.message_id,
                    mlDeleted: true
                });
                break;
            case "createGroup":
                await leave("", { channel: { id: interaction.channel_id } });
                await startGroup("", { channel: { id: interaction.channel_id } });
                break;
            default:
                return;
        }
    },
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (message.author.id === UserStore.getCurrentUser().id) return;
            if (!message.content) return;
            const encryptcordGroupMembers = await DataStore.get("encryptcordGroupMembers");
            if (!Object.keys(encryptcordGroupMembers).some(key => key === message.author.id)) {
                switch (message.content.toLowerCase().split("```")[0]) {
                    case "groupdata":
                        const response = await fetch(message.attachments[0].url);
                        const groupdata = await response.json();
                        await handleGroupData(groupdata);
                        break;
                    case "join":
                        if (encryptcordGroupMembers[UserStore.getCurrentUser().id].child) return;
                        if (!await DataStore.get("encryptcordGroup")) return;
                        const sender = await UserUtils.getUser(message.author.id).catch(() => null);
                        if (!sender) return;
                        const userKey = message.content.split("```")[1];
                        await handleJoin(sender.id, userKey, encryptcordGroupMembers);
                        break;
                    default:
                        break;
                }
                return;
            }
            const dmChannelId = await PrivateChannelsStore.getOrEnsurePrivateChannel(message.author.id);
            if (channelId !== dmChannelId) return;
            const sender = await UserUtils.getUser(message.author.id).catch(() => null);
            if (!sender) return;
            const groupChannel = await DataStore.get("encryptcordChannelId");
            switch (message.content.toLowerCase()) {
                case "leaving":
                    handleLeaving(sender.id, encryptcordGroupMembers, groupChannel);
                    break;
                case "message":
                    const msgResponse = await fetch(message.attachments[0].url);
                    const messagedata = await msgResponse.json();
                    await handleMessage(messagedata, sender.id, groupChannel);
                    break;
                case "groupdata":
                    const response = await fetch(message.attachments[0].url);
                    const groupdata = await response.json();
                    await handleGroupData(groupdata);
                    break;
                default:
                    break;
            }
        },
    },
    commands: [
        {
            name: "encryptcord",
            description: "End-to-end encryption in Discord!",
            options: [
                {
                    name: "leave",
                    description: "Leave current group",
                    options: [],
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                },
                {
                    name: "data",
                    description: "View your keys and current group members",
                    options: [],
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                },
            ],
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                switch (opts[0].name) {
                    case "start":
                        startGroup(opts[0].options, ctx);
                        break;
                    case "leave":
                        leave(opts[0].options, ctx);
                        break;
                    case "data":
                        data(opts[0].options, ctx);
                        break;
                }
            },
        },
    ],
    async start() {
        addChatBarButton("Encryptcord", ChatBarIcon);
        const pair = await generateKeys();
        await DataStore.set("encryptcordPublicKey", pair.publicKey);
        await DataStore.set("encryptcordPrivateKey", pair.privateKey);
        if (await DataStore.get("encryptcordGroup") === true) {
            await leave("", { channel: { id: await DataStore.get("encryptcordChannelId") } });
        }
        await DataStore.set("encryptcordGroup", false);
        await DataStore.set("encryptcordChannelId", "");
        await DataStore.set("encryptcordGroupMembers", {});
    },
    async stop() {
        removeButton("Encryptcord");
        if (await DataStore.get("encryptcordGroup") === true) {
            await leave("", { channel: { id: await DataStore.get("encryptcordChannelId") } });
        }
    },
});

// Send Temporary Message
async function sendTempMessage(recipientId: string, attachment: string, content: string, dm: boolean = true) {
    if (recipientId === UserStore.getCurrentUser().id) return;
    const channelId = dm ? await PrivateChannelsStore.getOrEnsurePrivateChannel(recipientId) : recipientId;
    if (attachment && attachment !== "") {
        const upload = await new CloudUtils.CloudUpload({
            file: new File([new Blob([attachment])], "file.text", { type: "text/plain; charset=utf-8" }),
            isClip: false,
            isThumbnail: false,
            platform: 1,
        }, channelId, false, 0);
        upload.on("complete", async () => {
            const messageId = await RestAPI.post({
                url: `/channels/${channelId}/messages`,
                body: {
                    content,
                    attachments: [{
                        id: "0",
                        filename: upload.filename,
                        uploaded_filename: upload.uploadedFilename,
                    }],
                    nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                },
            }).then(response => response.body.id);

            await sleep(500);
            MessageActions.deleteMessage(channelId, messageId);
        });
        await upload.upload();
        return;
    }

    const messageId = await RestAPI.post({
        url: `/channels/${channelId}/messages`,
        body: {
            content,
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
        },
    }).then(response => response.body.id);

    await sleep(500);
    MessageActions.deleteMessage(channelId, messageId);
}

// Handle leaving group
async function handleLeaving(senderId: string, encryptcordGroupMembers: object, groupChannel: string) {
    const updatedMembers = Object.keys(encryptcordGroupMembers).reduce((result, memberId) => {
        if (memberId !== senderId) {
            result[memberId] = encryptcordGroupMembers[memberId];
            if (result[memberId].child === senderId) {
                result[memberId].child = encryptcordGroupMembers[senderId].child;
            }
            if (result[memberId].parent === senderId) {
                result[memberId].parent = encryptcordGroupMembers[senderId].parent;
            }
        }
        return result;
    }, {});

    await DataStore.set("encryptcordGroupMembers", updatedMembers);

    await MessageActions.receiveMessage(groupChannel, await createMessage("", senderId, groupChannel, 2));
}

// Handle receiving message
async function handleMessage(message, senderId: string, groupChannel: string) {
    const decryptedMessage = await decryptData(await DataStore.get("encryptcordPrivateKey"), message);
    await MessageActions.receiveMessage(groupChannel, await createMessage(decryptedMessage, senderId, groupChannel, 0));
}

// Handle receiving group data
async function handleGroupData(groupData) {
    await DataStore.set("encryptcordChannelId", groupData.channel);
    await DataStore.set("encryptcordGroupMembers", groupData.members);
    await DataStore.set("encryptcordGroup", true);
    await MessageActions.receiveMessage(groupData.channel, await createMessage("", UserStore.getCurrentUser().id, groupData.channel, 7));
    setEnabled(true);
}

// Handle joining group
async function handleJoin(senderId: string, senderKey: string, encryptcordGroupMembers: object) {
    encryptcordGroupMembers[senderId] = { key: senderKey, parent: UserStore.getCurrentUser().id, child: null };
    encryptcordGroupMembers[UserStore.getCurrentUser().id].child = senderId;
    await DataStore.set("encryptcordGroupMembers", encryptcordGroupMembers);
    const groupChannel = await DataStore.get("encryptcordChannelId");
    const newMember = await UserUtils.getUser(senderId).catch(() => null);
    if (!newMember) return;

    const membersData = {};
    Object.entries(encryptcordGroupMembers)
        .forEach(([memberId, value]) => {
            membersData[memberId] = value;
        });

    const membersDataString = JSON.stringify({ members: membersData, channel: groupChannel });

    const dmPromises = Object.keys(encryptcordGroupMembers).map(async memberId => {
        const groupMember = await UserUtils.getUser(memberId).catch(() => null);
        if (!groupMember) return;
        await sendTempMessage(groupMember.id, membersDataString, "groupdata");
    });

    await Promise.all(dmPromises);
    await MessageActions.receiveMessage(groupChannel, {
        ...await createMessage("", senderId, groupChannel, 7), components: [{
            type: 1,
            components: [{
                type: 2,
                style: 4,
                label: "I don't want to talk to you!",
                custom_id: "removeFromSelf"
            },
            {
                type: 2,
                style: 2,
                label: "(Other users can still send/receive messages to/from them)",
                disabled: true,
                custom_id: "encryptcord"
            }]
        }]
    });
}

// Create message for group
async function createMessage(message: string, senderId: string, channelId: string, type: number) {
    const messageStart = MessageCreator.createBotMessage({ channelId, content: "", embeds: [] });
    const sender = await UserUtils.getUser(senderId).catch(() => null);
    if (!sender) return;
    return { ...messageStart, content: message, author: sender, type, flags: 0 };
}

// Start E2EE Group
async function startGroup(opts, ctx) {
    const channelId = ctx.channel.id;
    await DataStore.set("encryptcordChannelId", channelId);
    await DataStore.set("encryptcordGroupMembers", {
        [UserStore.getCurrentUser().id]: { key: await DataStore.get("encryptcordPublicKey"), parent: null, child: null }
    });
    await DataStore.set("encryptcordGroup", true);
    sendBotMessage(channelId, { content: "Group created!\n> Other users can click the lock icon to join." });
    await MessageActions.receiveMessage(channelId, await createMessage("", UserStore.getCurrentUser().id, channelId, 7));
    setEnabled(true);
}

// Leave the Group;
async function leave(opts, ctx) {
    const channelId = ctx.channel.id;
    if (!(await DataStore.get("encryptcordGroup"))) {
        sendBotMessage(channelId, { content: "You're not in a group!" });
        return;
    }
    const user = UserStore.getCurrentUser();
    const encryptcordGroupMembers = await DataStore.get("encryptcordGroupMembers");

    const dmPromises = Object.keys(encryptcordGroupMembers).map(async memberId => {
        const groupMember = await UserUtils.getUser(memberId).catch(() => null);
        if (!groupMember) return;
        await sendTempMessage(groupMember.id, "", "leaving");
    });

    await Promise.all(dmPromises);
    await DataStore.set("encryptcordGroup", false);
    await DataStore.set("encryptcordChannelId", "");
    await DataStore.set("encryptcordGroupMembers", {});
    await MessageActions.receiveMessage(channelId, await createMessage("", user.id, channelId, 2));
    setEnabled(false);
}

// View user data
async function data(opts, ctx) {
    const channelId = ctx.channel.id;
    const encryptcordGroupMembers = await DataStore.get("encryptcordGroupMembers");
    const encryptcordPublicKey = await DataStore.get("encryptcordPublicKey");
    const encryptcordPrivateKey = await DataStore.get("encryptcordPrivateKey");
    const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", encryptcordPrivateKey);
    const groupMembers = Object.keys(encryptcordGroupMembers);
    sendBotMessage(channelId, {
        content: `## Public key:\n\`\`\`${encryptcordPublicKey}\`\`\`\n## Private key:\n||\`\`\`${formatPemKey(exportedPrivateKey, "private")}\`\`\`||*(DO **NOT** SHARE THIS)*\n## Group members:\n\`\`\`json\n${JSON.stringify(groupMembers)}\`\`\``
    });
}
