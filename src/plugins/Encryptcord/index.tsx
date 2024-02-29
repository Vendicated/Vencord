import { addChatBarButton, ChatBarButton } from "@api/ChatButtons";
import { removeButton } from "@api/MessagePopover";
import definePlugin, { StartAt } from "@utils/types";
import * as DataStore from "@api/DataStore";
import { sleep } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import { useEffect, useState } from "@webpack/common";
import {
    RestAPI,
    SnowflakeUtils,
    UserUtils,
    UserStore,
    MessageActions,
} from "@webpack/common";
import {
    ApplicationCommandInputType,
    sendBotMessage,
    ApplicationCommandOptionType,
    findOption,
} from "@api/Commands";
import { Message } from "discord-types/general";
const MessageCreator = findByPropsLazy("createBotMessage");
const CloudUtils = findByPropsLazy("CloudUpload");
import axios from 'axios';
import { getCurrentChannel } from "@utils/discord";
import forge from 'node-forge';

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

// Generate RSA key pair
function generateKeyPair(): { privateKey: string; publicKey: string; } {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 1024 });
    const privateKey = forge.pki.privateKeyToPem(keys.privateKey);
    const publicKey = forge.pki.publicKeyToPem(keys.publicKey);

    return { privateKey, publicKey };
}

// Encrypt message with public key
function encrypt(message: string, publicKey): string[] {
    try {
        const publicKeyObj = forge.pki.publicKeyFromPem(publicKey);
        const chunkSize = 62;

        const encryptedChunks: string[] = [];

        for (let i = 0; i < message.length; i += chunkSize) {
            const chunk = message.substring(i, i + chunkSize);
            const encryptedChunk = publicKeyObj.encrypt(chunk, 'RSA-OAEP', {
                md: forge.md.sha256.create(),
            });
            encryptedChunks.push(forge.util.encode64(encryptedChunk));
        }

        return encryptedChunks;
    } catch (error) {
        return [];
    }
}

// Decrypt message with private key
function decrypt(encryptedMessages: string[], privateKey): string {
    const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
    let decryptedMessages: string[] = [];

    encryptedMessages.forEach((encryptedMessage) => {
        const encrypted = forge.util.decode64(encryptedMessage);
        const decrypted = privateKeyObj.decrypt(encrypted, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
        });
        decryptedMessages.push(decrypted);
    });

    return decryptedMessages.join('');
}

// Chat Bar Icon Component
const ChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const listener: SendListener = async (_, message) => {
            if (enabled) {
                const groupChannel = await DataStore.get('encryptcordChannelId');
                if (getCurrentChannel().id !== groupChannel) {
                    sendBotMessage(getCurrentChannel().id, { content: `You must be in <#${groupChannel}> to send an encrypted message!\n> If you wish to send an unencrypted message, please click the button in the chatbar.` });
                    message.content = "";
                    return;
                }
                const trimmedMessage = message.content.trim();
                await MessageActions.receiveMessage(groupChannel, await createMessage(trimmedMessage, UserStore.getCurrentUser().id, groupChannel, 0));
                const encryptcordGroupMembers = await DataStore.get('encryptcordGroupMembers');
                const dmPromises = Object.keys(encryptcordGroupMembers).map(async (memberId) => {
                    const groupMember = await UserUtils.getUser(memberId).catch(() => null);
                    if (!groupMember) return;
                    const encryptedMessage = encrypt(trimmedMessage, encryptcordGroupMembers[memberId]);
                    const encryptedMessageString = JSON.stringify(encryptedMessage);
                    await sendTempMessage(groupMember.id, encryptedMessageString, `message`);
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
                const groupChannel = await DataStore.get('encryptcordChannelId');
                if (await DataStore.get('encryptcordGroup') == false) {
                    sendBotMessage(getCurrentChannel().id, { content: `You must be in an E2EE group to send an encrypted message!` });
                    return;
                }
                if (getCurrentChannel().id !== groupChannel) {
                    sendBotMessage(getCurrentChannel().id, { content: `You must be in the E2EE group channel to send an encrypted message!` });
                    return;
                }
                setEnabled(!enabled);
            }}
            buttonProps={{
                "aria-haspopup": "dialog",
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
    authors: [
        {
            id: 761777382041714690n,
            name: "Inbestigator",
        },
    ],
    dependencies: ["CommandsAPI"],
    patches: [
        {
            find: "executeMessageComponentInteraction:",
            replacement: {
                match: /await\s+l\.default\.post\({\s*url:\s*A\.Endpoints\.INTERACTIONS,\s*body:\s*C,\s*timeout:\s*3e3\s*},\s*t\s*=>\s*{\s*h\(T,\s*p,\s*f,\s*t\)\s*}\s*\)/,
                replace: 'await $self.joinGroup(C);$&'
            }
        }
    ],
    async joinGroup(interaction) {
        const sender = await UserUtils.getUser(interaction.application_id).catch(() => null);
        if (!sender || sender.bot == true) return;
        if (interaction.data.component_type == 2 && interaction.data.custom_id == "acceptGroup") {
            await sendTempMessage(interaction.application_id, `${await DataStore.get("encryptcordPublicKey")}`, "join");
        }
    },
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            const encryptcordGroupMembers = await DataStore.get('encryptcordGroupMembers');
            if (!Object.keys(encryptcordGroupMembers).some(key => key == message.author.id)) {
                const encryptcordGroupJoinList = await DataStore.get('encryptcordGroupJoinList');
                if (!encryptcordGroupJoinList.includes(message.author.id)) {
                    switch (message.content.split("/")[0].toLowerCase()) {
                        case "e2eeinvite":
                            const inviteMessage = `I've invited you to an [end-to-end encrypted](<https://en.wikipedia.org/wiki/End-to-end_encryption/>) group in <#${message.content.split("/")[1]}>.`;
                            await MessageActions.receiveMessage(channelId, {
                                ...await createMessage(inviteMessage, message.author.id, channelId, 0), components: [{
                                    type: 1,
                                    components: [{
                                        type: 2,
                                        style: 3,
                                        label: 'Accept!',
                                        custom_id: 'acceptGroup'
                                    }]
                                }]
                            });
                            break;
                        case "groupdata":
                            const groupdata = (await axios.get(message.attachments[0].url)).data;
                            await handleGroupData(groupdata);
                            break;
                        default:
                            break;
                    }
                    return;
                };
                if (message.content.toLowerCase() !== "join") return;
                const sender = await UserUtils.getUser(message.author.id).catch(() => null);
                if (!sender) return;
                const userKey = (await axios.get(message.attachments[0].url)).data;
                await handleJoin(sender.id, userKey, encryptcordGroupMembers);
                return;
            }
            const dmChannelId = await RestAPI.post({
                url: `/users/@me/channels`,
                body: {
                    recipient_id: message.author.id,
                },
            }).then((response) => response.body.id);
            if (channelId !== dmChannelId) return;
            const sender = await UserUtils.getUser(message.author.id).catch(() => null);
            if (!sender) return;
            const groupChannel = await DataStore.get('encryptcordChannelId');
            switch (message.content.toLowerCase()) {
                case "leaving":
                    handleLeaving(sender.id, encryptcordGroupMembers, groupChannel);
                    break;
                case "message":
                    const messagedata = (await axios.get(message.attachments[0].url)).data;
                    await handleMessage(messagedata, sender.id, groupChannel);
                    break;
                case "groupdata":
                    const groupdata = (await axios.get(message.attachments[0].url)).data;
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
                    name: "start",
                    description: "Start an E2EE group",
                    options: [],
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                },
                {
                    name: "invite",
                    description: "Invite a user to your group",
                    options: [
                        {
                            name: "user",
                            description: "Who to invite",
                            required: true,
                            type: ApplicationCommandOptionType.USER,
                        },
                    ],
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                },
            ],
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                switch (opts[0].name) {
                    case "start":
                        startGroup(opts[0].options, ctx);
                        break;
                    case "invite":
                        invite(opts[0].options, ctx);
                        break;
                    case "leave":
                        leave(opts[0].options, ctx);
                        break;
                }
            },
        },
    ],
    startAt: StartAt.DOMContentLoaded,
    async start() {
        addChatBarButton("Encryptcord", ChatBarIcon);
        const pair = generateKeyPair();
        await DataStore.set('encryptcordPublicKey', pair.publicKey);
        await DataStore.set('encryptcordPrivateKey', pair.privateKey);
        if (await DataStore.get("encryptcordGroup") == true) {
            await leave("", { channel: { id: await DataStore.get("encryptcordChannelId") } });
        }
        await DataStore.set('encryptcordGroup', false);
        await DataStore.set('encryptcordChannelId', "");
        await DataStore.set('encryptcordGroupMembers', {});
        await DataStore.set('encryptcordGroupJoinList', []);
    },
    stop() {
        removeButton("Encryptcord");
    },
});

// Send Temporary Message
async function sendTempMessage(recipientId: string, attachment: string, content: string) {
    if (recipientId == UserStore.getCurrentUser().id) return;

    const dmChannelId = await RestAPI.post({
        url: `/users/@me/channels`,
        body: {
            recipient_id: recipientId,
        },
    }).then((response) => response.body.id);

    if (attachment && attachment != "") {
        const upload = await new CloudUtils.CloudUpload({
            file: new File([new Blob([attachment])], "file.text", { type: "text/plain; charset=utf-8" }),
            isClip: false,
            isThumbnail: false,
            platform: 1,
        }, dmChannelId, false, 0);
        upload.on("complete", async () => {
            const messageId = await RestAPI.post({
                url: `/channels/${dmChannelId}/messages`,
                body: {
                    content,
                    attachments: [{
                        id: "0",
                        filename: upload.filename,
                        uploaded_filename: upload.uploadedFilename,
                    }],
                    nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                },
            }).then((response) => response.body.id);

            await sleep(500);
            RestAPI.delete({
                url: `/channels/${dmChannelId}/messages/${messageId}`
            });
        });
        await upload.upload();
        return;
    }

    const messageId = await RestAPI.post({
        url: `/channels/${dmChannelId}/messages`,
        body: {
            content,
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
        },
    }).then((response) => response.body.id);

    await sleep(500);
    RestAPI.delete({
        url: `/channels/${dmChannelId}/messages/${messageId}`
    });
}

// Handle leaving group
async function handleLeaving(senderId: string, encryptcordGroupMembers: object, groupChannel: string) {
    const updatedMembers = Object.keys(encryptcordGroupMembers).reduce((result, memberId) => {
        if (memberId !== senderId) {
            result[memberId] = encryptcordGroupMembers[memberId];
        }
        return result;
    }, {});

    await DataStore.set('encryptcordGroupMembers', updatedMembers);

    await MessageActions.receiveMessage(groupChannel, await createMessage("", senderId, groupChannel, 2));
}

// Handle receiving message
async function handleMessage(message, senderId: string, groupChannel: string) {
    const decryptedMessage = decrypt(message, await DataStore.get("encryptcordPrivateKey"));
    await MessageActions.receiveMessage(groupChannel, await createMessage(decryptedMessage, senderId, groupChannel, 0));
}

// Handle receiving group data
async function handleGroupData(groupData) {
    await DataStore.set('encryptcordChannelId', groupData.channel);
    await DataStore.set('encryptcordGroupMembers', groupData.members);
    await DataStore.set('encryptcordGroup', true);
    await MessageActions.receiveMessage(groupData.channel, await createMessage("", UserStore.getCurrentUser().id, groupData.channel, 7));
    setEnabled(true);
}

// Handle joining group
async function handleJoin(senderId: string, senderKey: string, encryptcordGroupMembers: object) {
    const encryptcordGroupJoinList = await DataStore.get('encryptcordGroupJoinList');
    const updatedMembers = encryptcordGroupJoinList.filter(memberId => memberId !== senderId);
    await DataStore.set('encryptcordGroupJoinList', updatedMembers);

    encryptcordGroupMembers[senderId] = senderKey;
    await DataStore.set('encryptcordGroupMembers', encryptcordGroupMembers);
    const groupChannel = await DataStore.get('encryptcordChannelId');
    const newMember = await UserUtils.getUser(senderId).catch(() => null);
    if (!newMember) return;

    const membersData = {};
    Object.entries(encryptcordGroupMembers)
        .forEach(([memberId, value]) => {
            membersData[memberId] = value;
        });

    const membersDataString = JSON.stringify({ members: membersData, channel: groupChannel });

    const dmPromises = Object.keys(encryptcordGroupMembers).map(async (memberId) => {
        const groupMember = await UserUtils.getUser(memberId).catch(() => null);
        if (!groupMember) return;
        await sendTempMessage(groupMember.id, membersDataString, `groupdata`);
    });

    await Promise.all(dmPromises);
    await MessageActions.receiveMessage(groupChannel, await createMessage("", senderId, groupChannel, 7));
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
    await DataStore.set('encryptcordChannelId', channelId);
    await DataStore.set('encryptcordGroupMembers', {
        [UserStore.getCurrentUser().id]: await DataStore.get("encryptcordPublicKey")
    });
    await DataStore.set('encryptcordGroupJoinList', []);
    await DataStore.set('encryptcordGroup', true);
    sendBotMessage(channelId, { content: "Group created!" });
    await MessageActions.receiveMessage(channelId, await createMessage("", UserStore.getCurrentUser().id, channelId, 7));
    setEnabled(true);
}

// Invite User to Group
async function invite(opts, ctx) {
    const invitedUser = await UserUtils.getUser(findOption(opts, "user", "")).catch(() => null);
    if (!invitedUser) return;

    const channelId = ctx.channel.id;
    if (!(await DataStore.get('encryptcordGroup'))) {
        sendBotMessage(channelId, { content: `You're not in a group!` });
        return;
    }

    const encryptcordGroupMembers = await DataStore.get('encryptcordGroupMembers');
    if (Object.keys(encryptcordGroupMembers).some(key => key == invitedUser.id)) {
        sendBotMessage(channelId, { content: `<@${invitedUser.id}> is already in the group.` });
        return;
    }

    const encryptcordGroupJoinList = await DataStore.get('encryptcordGroupJoinList');
    if (encryptcordGroupJoinList.includes(invitedUser.id)) {
        sendBotMessage(channelId, { content: `<@${invitedUser.id}> is already in the join list.` });
        return;
    }

    encryptcordGroupJoinList.push(invitedUser.id);
    await DataStore.set('encryptcordGroupJoinList', encryptcordGroupJoinList);

    await sendTempMessage(invitedUser.id, "", `e2eeinvite/${await DataStore.get('encryptcordChannelId')}`);

    sendBotMessage(channelId, { content: `<@${invitedUser.id}> invited successfully.` });
}

// Leave the Group
async function leave(opts, ctx) {
    const channelId = ctx.channel.id;
    if (!(await DataStore.get('encryptcordGroup'))) {
        sendBotMessage(channelId, { content: `You're not in a group!` });
        return;
    }
    const user = UserStore.getCurrentUser();
    const encryptcordGroupMembers = await DataStore.get('encryptcordGroupMembers');

    const dmPromises = Object.keys(encryptcordGroupMembers).map(async (memberId) => {
        const groupMember = await UserUtils.getUser(memberId).catch(() => null);
        if (!groupMember) return;
        await sendTempMessage(groupMember.id, "", `leaving`);
    });

    await Promise.all(dmPromises);
    await DataStore.set('encryptcordGroup', false);
    await DataStore.set('encryptcordChannelId', "");
    await DataStore.set('encryptcordGroupMembers', {});
    await DataStore.set('encryptcordGroupJoinList', []);
    await MessageActions.receiveMessage(channelId, await createMessage("", user.id, channelId, 2));
    setEnabled(false);
}
