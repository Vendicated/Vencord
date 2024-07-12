/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ChatBarButton,
    addChatBarButton,
    removeChatBarButton,
} from "@api/ChatButtons";
import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    sendBotMessage,
} from "@api/Commands";
import { addDecoration } from "@api/MessageDecorations";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { updateMessage } from "@api/MessageUpdater";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { ChannelStore, MessageCache, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";
import { React, UserStore } from "@webpack/common";
import { Config } from "./native";

const LOCK_ICON = ErrorBoundary.wrap(
    () => (
        <Tooltip text={"Secured with PGP"}>
            {(tooltipProps: any) => (
                <svg
                    {...tooltipProps}
                    height="18"
                    width="20"
                    viewBox="0 0 24 24"
                    aria-hidden={true}
                    role="img"
                    color="lightgreen"
                >
                    <path
                        className="shc-evenodd-fill-current-color"
                        d="M17 11V7C17 4.243 14.756 2 12 2C9.242 2 7 4.243 7 7V11C5.897 11 5 11.896 5 13V20C5 21.103 5.897 22 7 22H17C18.103 22 19 21.103 19 20V13C19 11.896 18.103 11 17 11ZM12 18C11.172 18 10.5 17.328 10.5 16.5C10.5 15.672 11.172 15 12 15C12.828 15 13.5 15.672 13.5 16.5C13.5 17.328 12.828 18 12 18ZM15 11H9V7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V11Z"
                    />
                </svg>
            )}
        </Tooltip>
    ),
    { noop: true },
);

const PGP_MESSAGE_REGEX: RegExp =
    /-----BEGIN PGP MESSAGE-----(.*)-----END PGP MESSAGE-----/s;

const PGP_PUBLIC_KEY_REGEX =
    /-----BEGIN PGP PUBLIC KEY BLOCK-----(.*)-----END PGP PUBLIC KEY BLOCK-----/s;

const Native = VencordNative.pluginHelpers.GPGEncryption as PluginNative<
    typeof import("./native")
>;

let isActive = false;
let config: Config;

const containsPGPMessage = (text: string): boolean => {
    return PGP_MESSAGE_REGEX.test(text);
};

const containsPGPKey = (text: string): boolean => {
    return PGP_PUBLIC_KEY_REGEX.test(text);
};

const decryptPgpMessages = async (channelId: string) => {
    try {
        const cache = MessageCache.getOrCreate(channelId);

        const messages: Message[] = cache.toArray();
        const pgp: Message[] = [];

        for (const m of messages) {
            if (containsPGPMessage(m.content)) {
                pgp.push(m);
                updateMessage(channelId, m.id, {
                    content: "*Encrypted Message - pending decryption...*",
                });
            }
        }

        for (const pgpMessage of pgp) {
            try {
                const content = await Native.decryptMessage(pgpMessage.content);
                console.log("decrypting message", pgpMessage.id);
                updateMessage(channelId, pgpMessage.id, {
                    content,
                });
                addDecoration(`pgp-lock`, LOCK_ICON, pgpMessage.id);
            } catch (e) {
                console.log("unable to decrypt", e);
            }
        }
    } catch (e) {
        console.error(e);
    }
};

function GPGToggle() {
    const [isActiveListener, setIsActiveListener] = React.useState(false);

    return (
        <ChatBarButton
            tooltip={`Encryption is ${isActiveListener ? "enabled" : "disabled"}.`}
            onClick={() => {
                isActive = !isActive;
                setIsActiveListener(isActive);
            }}
            buttonProps={{
                style: {
                    translate: "0 2px",
                },
            }}
        >
            {isActiveListener ? (
                <svg
                    fill="currentColor"
                    fillRule="evenodd"
                    width="24"
                    height="24"
                    style={{ scale: "0.9", translate: "0 -2px" }}
                    viewBox="0 0 24 24"
                >
                    <path
                        fillRule="evenodd"
                        d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                        clipRule="evenodd"
                    />
                </svg>
            ) : (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    fillRule="evenodd"
                    width="24"
                    height="24"
                    style={{ scale: "0.9", translate: "0 -2px" }}
                    viewBox="0 0 24 24"
                >
                    <path d="M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 0 1-1.5 0V6.75a3.75 3.75 0 1 0-7.5 0v3a3 3 0 0 1 3 3v6.75a3 3 0 0 1-3 3H3.75a3 3 0 0 1-3-3v-6.75a3 3 0 0 1 3-3h9v-3c0-2.9 2.35-5.25 5.25-5.25Z" />
                </svg>
            )}
        </ChatBarButton>
    );
}

enum SetupState {
    NONE,
    KEYSELECT,
}

let setupState = SetupState.NONE;

export default definePlugin({
    name: "GPGEncryption",
    description:
        "Allows you to send GPG encrypted messages to other users with the plugin",
    authors: [Devs.zoeycodes, Devs.jg],
    dependencies: [
        "MessageEventsAPI",
        "CommandsAPI",
        "MessageDecorationsAPI",
        "ChatInputButtonAPI",
    ],

    commands: [
        {
            name: "gpgshare",
            description: "Share GPG Public Key",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                {
                    required: true,
                    name: "Key ID",
                    type: ApplicationCommandOptionType.STRING,
                    description: "ID of GPG key",
                },
            ],
            execute: async (args, _) => {
                let publicKey: string;
                try {
                    publicKey = await Native.getPublicKey(args[0].value);
                } catch (e) {
                    publicKey = "";
                    console.error(e);
                }
                return {
                    content: publicKey,
                };
            },
        },

        {
            name: "gpgsetup",
            description: "Setup GPG Encryption for your account",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            async execute(args, ctx) {
                const keys = await Native.getPrivateKeys();
                const user = UserStore.getCurrentUser();

                if (keys.length === 0) {
                    sendBotMessage(ctx.channel.id, {
                        content:
                            "You do not have any signing keys, please generate one before running this command again!",
                    });
                    return;
                }

                if (keys.length > 1) {
                    const selectionText = keys
                        .map((k, idx) => `${idx}. ${k.info} (\`${k.id}\`)`)
                        .join("\n");

                    setupState = SetupState.KEYSELECT;

                    sendBotMessage(ctx.channel.id, {
                        content: `You have many private keys, please select one from the following (just say the number, ie \`1\`.) \n ${selectionText}`,
                    });
                } else {
                    await Native.importSigningKey(keys[0].id);
                    await Native.saveKey(keys[0], user.id, true);
                }
            },
        },
    ],

    flux: {
        LOCAL_MESSAGE_CREATE: async (event) => {
            // TODO: make keyselect mode channel only
            if (setupState === SetupState.KEYSELECT) {
                const cache = MessageCache.getOrCreate(
                    event.message.channel_id,
                );

                const messages: Message[] = cache
                    .toArray()
                    .filter(
                        (m: Message) => m.author.id === event.message.author.id,
                    );
                // ^ i have to do all this tomfoolery because for some godforsaken reason LOCAL_MESSAGE_CREATE doesn't include the content of the message????

                const message = messages[messages.length - 1];

                const parsed = Number(message.content);
                const keys = await Native.getPrivateKeys();

                if (message.content.toLowerCase() === "/gpgsetup") return;
                if (message.content.toLowerCase() === "cancel") {
                    setupState = SetupState.NONE;
                    sendBotMessage(event.message.channel_id, {
                        content: "Canceled PGP setup",
                    });
                    return;
                }

                if (isNaN(parsed) || parsed > keys.length || parsed < 0) {
                    sendBotMessage(event.message.channel_id, {
                        content:
                            "That is not a valid selection, please type a number in range or type `CANCEL`",
                    });
                    return;
                }

                const selected = keys[parsed - 1];
                const user = UserStore.getCurrentUser();
                await Native.importSigningKey(selected.id);
                await Native.saveKey(selected, user.id, true);
                setupState = SetupState.NONE;

                sendBotMessage(event.message.channel_id, {
                    content:
                        "Your private key has been imported and is ready for use!",
                });
            }
        },
        MESSAGE_CREATE: async (event) => {
            await decryptPgpMessages(event.message.channel_id);

            if (containsPGPKey(event.message.content)) {
                let sender = await Native.getPublicKeyInfo(
                    event.message.content,
                );

                sendBotMessage(event.message.channel_id, {
                    bot: true,
                    content: `This message looks to be a public key from \`${sender}\`, it has been automatically imported and signed.`,
                    // TODO: make this shit work (dies)
                    // specifically not auto import
                    // components: [
                    //     {
                    //         type: "1",
                    //         components: [
                    //             {
                    //                 type: "2",
                    //                 label: "Click me!",
                    //                 style: 1,
                    //                 custom_id: "import_gpg",
                    //             },
                    //         ],
                    //     },
                    // ],
                });

                const importRes = await Native.importKey(event.message.content);
                await Native.saveKey(importRes, "184010879161991168", false);
                config = await Native.getConfig();
            }
        },
        CHANNEL_SELECT: async (event) => {
            await decryptPgpMessages(event.channelId);
        },
        LOAD_MESSAGES_SUCCESS: async (event) => {
            await decryptPgpMessages(event.channelId);
        },
    },

    async start() {
        config = await Native.getConfig();
        addChatBarButton("gpgToggle", GPGToggle);
        try {
            this.preSend = addPreSendListener(async (channelId, msg) => {
                this.channelId = channelId;
                const channel = ChannelStore.getChannel(channelId);
                console.log(channel);
                if (!isActive) return;
                const friend = config.friends.find(
                    (f) => f.id === channel.recipients[0],
                );
                if (!friend) return;
                try {
                    const stdout = await Native.encryptMessage(msg.content, [
                        ...config.user.keys.map((k) => k.fingerprint),
                        ...friend.keys.map((k) => k.fingerprint),
                    ]);

                    msg.content = stdout;
                } catch (e) {
                    console.log("gpg error");
                }
            });
        } catch (e) {
            console.log(e);
        }
    },

    stop() {
        removePreSendListener(this.preSend);
        removeChatBarButton("gpgToggle");
    },
});
