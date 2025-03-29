/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React } from "@webpack/common";

// Big thank you too slientTyping

const settings = definePluginSettings(
    {
        name: {
            type: OptionType.STRING,
            description: "The signature that will be added to the end of your messages",
            default: "a chronic discord user"
        },
        showIcon: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Show an icon for toggling the plugin in the chat bar",
            restartNeeded: true,
        },
        contextMenu: {
            type: OptionType.BOOLEAN,
            description: "Add option to toggle the functionality in the chat input context menu",
            default: true
        },
        isEnabled: {
            type: OptionType.BOOLEAN,
            description: "Toggle functionality",
            default: true,
        },
    });

const SignatureToggle: ChatBarButtonFactory = ({ isMainChat }) => {
    const { isEnabled, showIcon } = settings.use(["isEnabled", "showIcon"]);
    const toggle = () => settings.store.isEnabled = !settings.store.isEnabled;

    if (!isMainChat || !showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable Signature" : "Enable Signature"}
            onClick={toggle}
        >
            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 21.333">
                <path fill="currentColor" mask="url(#signature-msg-mask)" d="M2 4.621a.5.5 0 0 1 .854-.353l6.01 6.01c.126.126.17.31.15.487a2 2 0 1 0 1.751-1.751a.59.59 0 0 1-.487-.15l-6.01-6.01A.5.5 0 0 1 4.62 2H11a9 9 0 0 1 8.468 12.054l2.24 2.239a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.415 0l-2.239-2.239A9 9 0 0 1 2 11z" />
                {isEnabled && (
                    <>
                        <mask id="signature-msg-mask"> <path fill="#fff" d="M0 0h24v24H0Z"></path>
                            <path stroke="#000" strokeWidth="5.99068" d="M0 24 24 0"></path> </mask>
                        <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                    </>
                )}
            </svg>
        </ChatBarButton>
    );
};

const handleMessage = ((channelId, msg) => {
    if (!settings.store.isEnabled) {
        msg.content = msg.content;
    } else {
        msg.content = textProcessing(msg.content);
    }
});

const ChatBarContextCheckbox: NavContextMenuPatchCallback = children => {
    const { isEnabled, contextMenu } = settings.use(["isEnabled", "contextMenu"]);
    if (!contextMenu) return;

    const group = findGroupChildrenByChildId("submit-button", children);

    if (!group) return;

    const idx = group.findIndex(c => c?.props?.id === "submit-button");

    group.splice(idx + 1, 0,
        <Menu.MenuCheckboxItem
            id="vc-Signature"
            label="Enable Signature"
            checked={isEnabled}
            action={() => settings.store.isEnabled = !settings.store.isEnabled}
        />
    );
};

export default definePlugin({
    name: "Signature",
    description: "Automated fingerprint/end text",
    authors: [Devs.Ven, Devs.Rini, Devs.ImBanana, EquicordDevs.KrystalSkull],
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],

    start: () => {
        if (settings.store.isEnabled) true;
        addChatBarButton("Signature", SignatureToggle);
        addMessagePreSendListener(handleMessage);
    },
    stop: () => {
        if (settings.store.isEnabled) false;
        removeChatBarButton("Signature");
        removeMessagePreSendListener(handleMessage);

    },

    settings,

    contextMenus: {
        "textarea-context": ChatBarContextCheckbox
    },

    commands: [{
        name: "Signature",
        description: "Toggle your signature",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "value",
                description: "Toggle your signature (default is toggle)",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
        ],
        execute: async (args, ctx) => {
            settings.store.isEnabled = !!findOption(args, "value", !settings.store.isEnabled);
            sendBotMessage(ctx.channel.id, {
                content: settings.store.isEnabled ? "Signature enabled!" : "Signature disabled!",
            });
        },
    }],
});


// text processing injection processor
function textProcessing(input: string) {
    return `${input}\n> ${settings.store.name}`;
}


