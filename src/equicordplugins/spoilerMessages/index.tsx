/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePreSendListener, removeMessagePreSendListener, Upload } from "@api/MessageEvents";
import { definePluginSettings, Settings } from "@api/Settings";
import { reverseExtensionMap } from "@equicordplugins/fixFileExtensions";
import { tarExtMatcher } from "@plugins/anonymiseFileNames";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React } from "@webpack/common";

// thnx signature / anonymize code
type SpoilUpload = Upload;
const settings = definePluginSettings(
    {
        spoilerWords: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "This will add a spoiler for every word within the message / attachments.",
            restartNeeded: true,
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

const SpoilerToggle: ChatBarButtonFactory = ({ isMainChat }) => {
    const { isEnabled, showIcon } = settings.use(["isEnabled", "showIcon"]);
    const toggle = () => settings.store.isEnabled = !settings.store.isEnabled;

    if (!isMainChat || !showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable Spoiler Message" : "Enable Spoiler Message"}
            onClick={toggle}
        >
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ scale: "1" }}>
                <path fill="currentColor" mask="url(#spoiler-msg-mask)" d="M21.7 2.3a1 1 0 0 1 0 1.4l-4.92 4.93c-.12.12-.33.09-.41-.06-.23-.42-.52-.8-.85-1.13a.26.26 0 0 1-.01-.36l4.78-4.79a1 1 0 0 1 1.42 0ZM20 20.6c0 .26.36.45.55.27l1.16-1.16a1 1 0 0 0-1.42-1.42l-.4.41a.25.25 0 0 0-.07.24c.12.53.18 1.09.18 1.66ZM4 20.6c0 .2.02.4.05.6a.26.26 0 0 1-.07.23l-.27.28a1 1 0 0 1-1.42-1.42l1.35-1.34c.19-.19.53.01.48.27-.08.45-.12.91-.12 1.38ZM16.7 3.7l-2.58 2.6a.26.26 0 0 1-.28.05A4.99 4.99 0 0 0 12 6c-.15 0-.23-.18-.13-.29L15.3 2.3a1 1 0 1 1 1.42 1.42ZM7 11c0-.15-.18-.23-.29-.13L2.3 15.3a1 1 0 1 0 1.42 1.42l3.58-3.6c.08-.06.1-.17.06-.27A4.99 4.99 0 0 1 7 11ZM18.23 15.36c-.1.1-.1.24-.02.35.32.37.6.77.83 1.2.09.14.29.18.41.05l2.26-2.25a1 1 0 0 0-1.42-1.42l-2.06 2.07ZM21.7 9.7l-4.62 4.64a.26.26 0 0 1-.33.03l-.45-.3a.27.27 0 0 1-.09-.37c.38-.6.64-1.27.74-2 0-.05.03-.1.07-.14L20.3 8.3a1 1 0 1 1 1.42 1.42ZM11.7 2.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4-1.4l8-8a1 1 0 0 1 1.4 0ZM6.7 3.7a1 1 0 0 0-1.4-1.4l-3 3a1 1 0 0 0 1.4 1.4l3-3ZM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 20.6c0-3.1 2.5-5.6 5.6-5.6h.8c3.1 0 5.6 2.5 5.6 5.6 0 .77-.63 1.4-1.4 1.4a.17.17 0 0 1-.16-.12c-.19-.7-.44-1.36-.68-1.89-.11-.24-.43-.15-.4.12l.08.8a1 1 0 0 1-1 1.09H9.55a1 1 0 0 1-.99-1.1l.08-.79c.03-.27-.29-.36-.4-.12-.24.53-.5 1.19-.68 1.89a.17.17 0 0 1-.16.12A1.4 1.4 0 0 1 6 20.6Z" transform="translate(2, 3)" />
                {isEnabled && (
                    <>
                        <mask id="spoiler-msg-mask">
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

const handleMessage = (channelId, msg) => {
    if (!settings.store.isEnabled || settings.store.isEnabled && msg.content.trim() === "") {
        msg.content = msg.content;
    } else if (settings.store.isEnabled && settings.store.spoilerWords) {
        msg.content = msg.content.split(/(\s+)/).map(word => word.trim() ? `||${word}||` : word).join("");
    } else {
        msg.content = textProcessing(msg.content);
    }
};


const ChatBarContextCheckbox: NavContextMenuPatchCallback = children => {
    const { isEnabled, contextMenu } = settings.use(["isEnabled", "contextMenu"]);
    if (!contextMenu) return;

    const group = findGroupChildrenByChildId("submit-button", children);

    if (!group) return;

    const idx = group.findIndex(c => c?.props?.id === "submit-button");

    group.splice(idx + 1, 0,
        <Menu.MenuCheckboxItem
            id="vc-Spoiler"
            label="Enable Spoiler"
            checked={isEnabled}
            action={() => settings.store.isEnabled = !settings.store.isEnabled}
        />
    );
};

export function spoiler(upload: SpoilUpload) {
    const file = upload.filename;
    const tarMatch = tarExtMatcher.exec(file);
    const extIdx = tarMatch?.index ?? file.lastIndexOf(".");
    const fileName = extIdx !== -1 ? file.substring(0, extIdx) : "";
    let ext = extIdx !== -1 ? file.slice(extIdx) : "";
    if (Settings.plugins.FixFileExtensions.enabled) {
        ext = reverseExtensionMap[ext] || ext;
    }
    if (settings.store.isEnabled) return "SPOILER_" + fileName + ext;
    return file;
}

export default definePlugin({
    name: "SpoilerMessages",
    description: "Automatically turn all your messages / attachments into a spoiler.",
    authors: [Devs.Ven, Devs.Rini, Devs.ImBanana, Devs.fawn, EquicordDevs.KrystalSkull, EquicordDevs.omaw],
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],
    patches: [
        {
            find: "instantBatchUpload:",
            replacement: {
                match: /uploadFiles:(\i),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=$self.spoiler(f)),$1(...args)),",
            },
            predicate: () => !Settings.plugins.AnonymiseFileNames.enabled && !Settings.plugins.FixFileExtensions,
        },
        {
            find: 'addFilesTo:"message.attachments"',
            replacement: {
                match: /(\i.uploadFiles\((\i),)/,
                replace: "$2.forEach(f=>f.filename=$self.spoiler(f)),$1"
            },
            predicate: () => !Settings.plugins.AnonymiseFileNames.enabled && !Settings.plugins.FixFileExtensions,
        },
    ],
    spoiler,
    start: () => {
        if (settings.store.isEnabled) true;
        addChatBarButton("Spoiler", SpoilerToggle);
        addMessagePreSendListener(handleMessage);
    },
    stop: () => {
        if (settings.store.isEnabled) false;
        removeChatBarButton("Spoiler");
        removeMessagePreSendListener(handleMessage);

    },
    settings,
    contextMenus: {
        "textarea-context": ChatBarContextCheckbox
    },
    commands: [{
        name: "Spoiler",
        description: "Toggle your spoiler",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "value",
                description: "Toggle your Spoiler (default is toggle)",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
        ],
        execute: async (args, ctx) => {
            settings.store.isEnabled = !!findOption(args, "value", !settings.store.isEnabled);
            sendBotMessage(ctx.channel.id, {
                content: settings.store.isEnabled ? "Spoiler enabled!" : "Spoiler disabled!",
            });
        },
    }],
});

// text processing injection processor
function textProcessing(input: string) {
    return `||${input}||`;
}
