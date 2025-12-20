/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { FluxDispatcher, Menu, React } from "@webpack/common";

const settings = definePluginSettings({
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
    isEnabled: {
        type: OptionType.BOOLEAN,
        description: "Toggle functionality",
        default: true,
    }
});

function SilentTypingEnabledIcon() {
    return (
        <SilentTypingIcon>
            <mask id="silent-typing-msg-mask">
                <path fill="#fff" d="M0 0h24v24H0Z"></path>
                <path stroke="#000" strokeWidth="5.99068" d="M0 24 24 0" transform="translate(-2, -3)"></path>
            </mask>
            <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
        </SilentTypingIcon>
    );
}

const SilentTypingIcon: IconComponent = ({ height = 20, width = 20, className, children }) => {
    return (
        <svg
            width={width}
            height={height}
            className={className}
            viewBox="0 0 24 24"
            style={{ scale: "1.2" }}
        >
            <path fill="currentColor" mask="url(#silent-typing-msg-mask)" d="M18.333 15.556H1.667a1.667 1.667 0 0 1 -1.667 -1.667v-10a1.667 1.667 0 0 1 1.667 -1.667h16.667a1.667 1.667 0 0 1 1.667 1.667v10a1.667 1.667 0 0 1 -1.667 1.667M4.444 6.25V4.861a0.417 0.417 0 0 0 -0.417 -0.417H2.639a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417H5.973a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m-11.667 3.333V8.194a0.417 0.417 0 0 0 -0.417 -0.417H4.306a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V8.194a0.417 0.417 0 0 0 -0.417 -0.417H7.639a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V8.194a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V8.194a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m-11.667 3.333v-1.389a0.417 0.417 0 0 0 -0.417 -0.417H2.639a0.417 0.417 0 0 0 -0.417 0.417V12.917a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m10 0v-1.389a0.417 0.417 0 0 0 -0.417 -0.417H5.973a0.417 0.417 0 0 0 -0.417 0.417V12.917a0.417 0.417 0 0 0 0.417 0.417h8.056a0.417 0.417 0 0 0 0.417 -0.417m3.333 0v-1.389a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V12.917a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417" transform="translate(2, 3)" />
            {children}
        </svg>
    );
};

const SilentTypingToggle: ChatBarButtonFactory = ({ isMainChat }) => {
    const { isEnabled, showIcon } = settings.use(["isEnabled", "showIcon"]);
    const toggle = () => settings.store.isEnabled = !settings.store.isEnabled;

    if (!isMainChat || !showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable Silent Typing" : "Enable Silent Typing"}
            onClick={toggle}
        >
            {isEnabled ? <SilentTypingEnabledIcon /> : <SilentTypingIcon />}
        </ChatBarButton>
    );
};


const ChatBarContextCheckbox: NavContextMenuPatchCallback = children => {
    const { isEnabled, contextMenu } = settings.use(["isEnabled", "contextMenu"]);
    if (!contextMenu) return;

    const group = findGroupChildrenByChildId("submit-button", children);

    if (!group) return;

    const idx = group.findIndex(c => c?.props?.id === "submit-button");

    group.splice(idx + 1, 0,
        <Menu.MenuCheckboxItem
            id="vc-silent-typing"
            label="Enable Silent Typing"
            checked={isEnabled}
            action={() => settings.store.isEnabled = !settings.store.isEnabled}
        />
    );
};


export default definePlugin({
    name: "SilentTyping",
    authors: [Devs.Ven, Devs.Rini, Devs.ImBanana],
    description: "Hide that you are typing",
    settings,

    contextMenus: {
        "textarea-context": ChatBarContextCheckbox
    },

    patches: [
        {
            find: '.dispatch({type:"TYPING_START_LOCAL"',
            replacement: {
                match: /startTyping\(\i\){.+?},stop/,
                replace: "startTyping:$self.startTyping,stop"
            }
        },
    ],

    commands: [{
        name: "silenttype",
        description: "Toggle whether you're hiding that you're typing or not.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "value",
                description: "whether to hide or not that you're typing (default is toggle)",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
        ],
        execute: async (args, ctx) => {
            settings.store.isEnabled = !!findOption(args, "value", !settings.store.isEnabled);
            sendBotMessage(ctx.channel.id, {
                content: settings.store.isEnabled ? "Silent typing enabled!" : "Silent typing disabled!",
            });
        },
    }],

    async startTyping(channelId: string) {
        if (settings.store.isEnabled) return;
        await FluxDispatcher.dispatch({type: "TYPING_START_LOCAL", channelId});
    },

    chatBarButton: {
        icon: SilentTypingIcon,
        render: SilentTypingToggle
    }
});
