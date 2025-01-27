/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings, Settings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { Link } from "@components/Link";
import { EquicordDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, Menu, MessageStore, React } from "@webpack/common";

import { transferMessage } from "./native";

const furudosettings = definePluginSettings(
    {
        isEnabled: {
            type: OptionType.BOOLEAN,
            description: "Toggle functionality",
            default: true,
        },
        provider: {
            description: "The AI provider to use",
            type: OptionType.SELECT,
            options: [
                { label: "OpenAI", value: "openai", default: true },
                { label: "Ollama", value: "ollama" },
            ],
        },
        apiKey: {
            type: OptionType.STRING,
            description: "OpenAI API key",
            placeholder: "sk-************************************************",
            default: ""
        },
        model: {
            type: OptionType.STRING,
            description: "OpenAI model",
            default: "",
            placeholder: "gpt-4o-mini"
        },
        showIcon: {
            type: OptionType.BOOLEAN,
            default: false,
            description: "Show an icon for toggling the plugin",
            restartNeeded: true,
        },
        contextMenu: {
            type: OptionType.BOOLEAN,
            description: "Add option to toggle the functionality in the chat input context menu",
            default: true
        },
        characterName: {
            type: OptionType.STRING,
            description: "The name of the character the AI is roleplaying as. Default is 'Gerry Furudo'",
            default: "Gerry Furudo",
            placeholder: "Gerry Furudo"
        },
        characterDescription: {
            type: OptionType.STRING,
            description: "A short description of the character the AI is playing as.",
            default: "the evil genius who seems to lose a braincell for each character typed",
            placeholder: "the evil genius who seems to lose a braincell for each character typed"
        },
        extraCharacterDescription: {
            type: OptionType.STRING,
            description: "Extra description of the character the AI is roleplaying as.",
            default: "A bot that has an unmated ego but lacks the wits to match that ego... <VERY GOOD!>",
            placeholder: "A bot that has an unmated ego but lacks the wits to match that ego... <VERY GOOD!>"
        },
        extraInstructions: {
            type: OptionType.STRING,
            description: "Extra instructions for the character the AI is roleplaying as. (Written in first person)",
            default: "I will also make sure to mispell as many words as possible",
            placeholder: "I will also make sure to mispell as many words as possible"
        },
        exampleOne: {
            type: OptionType.STRING,
            description: "How will your character say the sentence 'What's your name?",
            default: "Whot yur nam... IDIOT? <VERY GOOD!>",
            placeholder: "Whot yur nam... IDIOT? <VERY GOOD!>"
        },
        exampleTwo: {
            type: OptionType.STRING,
            description: "How will your character say 'Goodbye'?",
            default: "Farewell egnoramus... youy will never be missed... <GOOD!>",
            placeholder: "Farewell egnoramus... youy will never be missed... <GOOD!>"
        },
        exampleThree: {
            type: OptionType.STRING,
            description: "How will your character say 'Check this link: https://example.com'?",
            default: "Oi, tke a gender... this fantastical.. network location... https://example.com/... ecxiting, isn't it? A delightful page filled with unenumerable curiosities... <VERY GOOD!>",
            placeholder: "Oi, tke a gender... this fantastical.. network location... https://example.com/... ecxiting, isn't it? A delightful page filled with unenumerable curiosities... <VERY GOOD!>"
        },
    }
);

function messageSendListenerFuncs() {
    if (furudosettings.store.isEnabled) {
        addMessagePreSendListener(presendObject);
    } else {
        removeMessagePreSendListener(presendObject);
    }
}


const FurudoSpeakChatToggle: ChatBarButtonFactory = ({ isMainChat }) => {
    const { isEnabled, showIcon } = furudosettings.use(["isEnabled", "showIcon"]);
    const toggle = async () => {
        const done = await togglefunc();
        return done;
    };

    if (!isMainChat || !showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable FurudoSpeak" : "Enable FurudoSpeak"}
            onClick={toggle}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" version="1.1" style={{ scale: "1.2" }}>
                <path fill="currentColor" mask="url(#furudo-speak-msg-mask)" d="M 6.599 3.208 C 5.211 5.326, 4.758 10.131, 4.944 20.750 L 5.001 24 12.001 24 C 19.805 24, 20.702 22.979, 17.014 18.290 C 15.921 16.901, 15.302 15.320, 15.639 14.776 C 16.018 14.161, 16.534 14.247, 17 15 C 18.724 17.789, 20.480 9.573, 18.950 5.880 C 17.777 3.047, 17.133 2.678, 11.316 1.510 C 8.686 0.981, 7.864 1.277, 6.599 3.208 M 12 10.500 C 12 10.775, 12.225 11, 12.500 11 C 12.775 11, 13 10.775, 13 10.500 C 13 10.225, 12.775 10, 12.500 10 C 12.225 10, 12 10.225, 12 10.500 M 16 10.500 C 16 10.775, 16.225 11, 16.500 11 C 16.775 11, 17 10.775, 17 10.500 C 17 10.225, 16.775 10, 16.500 10 C 16.225 10, 16 10.225, 16 10.500 M 9 14 C 9 14.733, 9.300 15.033, 9.667 14.667 C 10.033 14.300, 10.033 13.700, 9.667 13.333 C 9.300 12.967, 9 13.267, 9 14" transform="translate(2, 3)" />
                {isEnabled && (
                    <>
                        <mask id="furudo-speak-msg-mask">
                            <path fill="#fff" d="M0 0h24v24H0Z"></path>
                            <path stroke="#000" strokeWidth="5.99068" d="M0 24 24 0" transform="translate(-2, -3)"></path>
                        </mask>
                        <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                    </>
                )}
            </svg>
        </ChatBarButton>
    );
};

async function togglefunc() {
    furudosettings.store.isEnabled = !furudosettings.store.isEnabled;
    messageSendListenerFuncs();
    return furudosettings.store.isEnabled;
}

const ChatBarContextCheckbox: NavContextMenuPatchCallback = children => {
    const { isEnabled, contextMenu } = furudosettings.use(["isEnabled", "contextMenu"]);
    if (!contextMenu) return;

    const group = findGroupChildrenByChildId("submit-button", children);
    if (!group) return;

    const idx = group.findIndex(c => c?.props?.id === "submit-button");

    group.splice(idx + 2, 0,
        <Menu.MenuCheckboxItem
            id="furudo-speak-toggle"
            label="Enable Furudo Speak"
            checked={isEnabled}
            action={() => togglefunc()}
        />
    );
};

const isConfigured = () => {
    const { provider, apiKey, model } = Settings.plugins.FurudoSpeak;

    for (const prop of [
        "characterName",
        "characterDescription",
        "extraCharacterDescription",
        "extraInstructions",
        "exampleOne",
        "exampleTwo",
        "exampleThree",
    ]) {
        if (!Settings.plugins.FurudoSpeak[prop]) {
            return false;
        }
    }

    switch (provider) {
        case "openai": {
            return !!(apiKey.trim() && model.trim());
        }

        case "ollama": {
            return !!model.trim();
        }
    }

    return false;
};


const presendObject: MessageSendListener = async (channelId, msg, extra) => {
    const messageRef = extra.replyOptions.messageReference;
    const repliedMessage =
        messageRef?.message_id && messageRef?.channel_id
            ? MessageStore.getMessage(
                messageRef.channel_id,
                messageRef.message_id
            )
            : undefined;

    if (!isConfigured()) {
        sendBotMessage(channelId, {
            content:
                "FurudoSpeak is not configured properly. Please ensure that both a model and api key set in the plugin settings.. as well as all character traits being set to something as long as it's not empty.",
        });
        return;
    }
    msg.content = await transferMessage(
        msg,
        Vencord.Settings.plugins.FurudoSpeak as any,
        repliedMessage
    );
};

export default definePlugin({
    name: "FurudoSpeak",
    description: "Makes every message you send FurudoSpeak. Modification of the shakespearean plugin to use OpenAI models with an OpenAI API key.",
    authors: [EquicordDevs.vmohammad, EquicordDevs.examplegit],
    dependencies: ["MessageEventsAPI"],
    settings: furudosettings,
    commands: [{
        name: "furudospeak",
        description: "Toggle whether furudo speak is enabled",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "value",
                description: "Whether to enable or disable furudo speak",
                required: true,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
        ],
        execute: async (args, ctx) => {
            furudosettings.store.isEnabled = !!findOption(args, "value", !furudosettings.store.isEnabled);
            if (furudosettings.store.isEnabled) { messageSendListenerFuncs(); }
            sendBotMessage(ctx.channel.id, {
                content: furudosettings.store.isEnabled ? "FurudoSpeak enabled!" : "FurudoSpeak disabled!",
            });
        },
    }],
    settingsAboutComponent: () => {
        const { provider, apiKey, model } = furudosettings.use([
            "provider",
            "apiKey",
            "model",
        ]);

        const isConfigured =
            provider === "openai"
                ? apiKey.trim() && model.trim()
                : provider === "ollama"
                    ? !!model.trim()
                    : false;

        return (
            <>
                {(!isConfigured) && (
                    <ErrorCard
                        className={classes(Margins.top16, Margins.bottom16)}
                        style={{ padding: "1em" }}
                    >
                        <Forms.FormTitle>Notice</Forms.FormTitle>
                        <Forms.FormText>FurudoSpeak is not configured. Please ensure that the relevant settings are set.</Forms.FormText>

                        <Forms.FormText>
                            An OpenAI api key can be generated at the: <Link href="https://platform.openai.com/settings/organization/api-keys">OpenAI Organization Settings Page.</Link>
                        </Forms.FormText>
                        <Forms.FormText>
                            Also pick an OpenAI/Ollama model to use for this plugin: refer to the <Link href="https://platform.openai.com/docs/models">OpenAI Models Page</Link> and <Link href="https://ollama.com/search">Ollama Models Page</Link> to find the model names.
                        </Forms.FormText>

                        <Forms.FormDivider className={Margins.top8} />
                    </ErrorCard>
                )}
            </>
        );
    },
    contextMenus: {
        "textarea-context": ChatBarContextCheckbox
    },

    start: () => {
        addChatBarButton("FurudoSpeak", FurudoSpeakChatToggle);
        messageSendListenerFuncs();
    },

    stop: () => {
        removeChatBarButton("FurudoSpeak");
        removeMessagePreSendListener(presendObject);
    }
});
