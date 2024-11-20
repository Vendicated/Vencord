/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
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

const SilentTypingToggle: ChatBarButton = ({ isMainChat }) => {
    const { isEnabled, showIcon } = settings.use(["isEnabled", "showIcon"]);
    const toggle = () => settings.store.isEnabled = !settings.store.isEnabled;

    if (!isMainChat || !showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable Silent Typing" : "Enable Silent Typing"}
            onClick={toggle}
        >
            <svg width="36" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 21.333">
                <path fill="currentColor" mask="url(#silent-typing-msg-mask)" d="M22 18.667H2c-1.105 0 -2 -0.895 -2 -2V4.667c0 -1.105 0.895 -2 2 -2h20c1.105 0 2 0.895 2 2v12c0 1.105 -0.895 2 -2 2M5.333 7.5v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5H3.167c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m-14 4v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m-14 4v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5H3.167c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5m12 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5H7.167c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h9.667c0.276 0 0.5 -0.224 0.5 -0.5m4 0v-1.667c0 -0.276 -0.224 -0.5 -0.5 -0.5h-1.667c-0.276 0 -0.5 0.224 -0.5 0.5v1.667c0 0.276 0.224 0.5 0.5 0.5h1.667c0.276 0 0.5 -0.224 0.5 -0.5" />
                {isEnabled && (
                    <>
                        <mask id="silent-typing-msg-mask">
                            <path fill="#fff" d="M0 0h24v24H0Z"></path>
                            <path stroke="#000" strokeWidth="5.99068" d="M0 24 24 0"></path>
                        </mask>
                        <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                    </>
                )}
            </svg>
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
    dependencies: ["ChatInputButtonAPI"],
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
        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });
    },

    start: () => addChatBarButton("SilentTyping", SilentTypingToggle),
    stop: () => removeChatBarButton("SilentTyping"),
});
