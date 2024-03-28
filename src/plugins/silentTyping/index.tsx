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
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, React } from "@webpack/common";

const settings = definePluginSettings({
    showIcon: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show an icon for toggling the plugin",
        restartNeeded: true,
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
            <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" mask="url(#_)" d="M24 10.3458V18C24 19.1046 23.1046 20 22 20H2C0.895417 20 0 19.1046 0 18V6C0 4.89542 0.895417 4 2 4H16.076C16.026 4.32521 16 4.65929 16 5C16 5.57831 16.075 6.13752 16.215 6.66667H15.1667C14.8905 6.66667 14.6667 6.89054 14.6667 7.16667V8.83333C14.6667 9.10946 14.8905 9.33333 15.1667 9.33333H16.8333C17.0836 9.33333 17.291 9.14941 17.3276 8.90936C18.3363 10.1893 19.8313 11 21.5 11C22.4002 11 23.2499 10.7641 24 10.3458ZM5.33333 7.16667V8.83333C5.33333 9.10946 5.10946 9.33333 4.83333 9.33333H3.16667C2.89054 9.33333 2.66667 9.10946 2.66667 8.83333V7.16667C2.66667 6.89054 2.89054 6.66667 3.16667 6.66667H4.83333C5.10946 6.66667 5.33333 6.89054 5.33333 7.16667ZM9.33333 7.16667V8.83333C9.33333 9.10946 9.10946 9.33333 8.83333 9.33333H7.16667C6.89054 9.33333 6.66667 9.10946 6.66667 8.83333V7.16667C6.66667 6.89054 6.89054 6.66667 7.16667 6.66667H8.83333C9.10946 6.66667 9.33333 6.89054 9.33333 7.16667ZM13.3333 7.16667V8.83333C13.3333 9.10946 13.1095 9.33333 12.8333 9.33333H11.1667C10.8905 9.33333 10.6667 9.10946 10.6667 8.83333V7.16667C10.6667 6.89054 10.8905 6.66667 11.1667 6.66667H12.8333C13.1095 6.66667 13.3333 6.89054 13.3333 7.16667ZM7.33333 11.1667V12.8333C7.33333 13.1095 7.10946 13.3333 6.83333 13.3333H5.16667C4.89054 13.3333 4.66667 13.1095 4.66667 12.8333V11.1667C4.66667 10.8905 4.89054 10.6667 5.16667 10.6667H6.83333C7.10946 10.6667 7.33333 10.8905 7.33333 11.1667ZM11.3333 11.1667V12.8333C11.3333 13.1095 11.1095 13.3333 10.8333 13.3333H9.16667C8.89054 13.3333 8.66667 13.1095 8.66667 12.8333V11.1667C8.66667 10.8905 8.89054 10.6667 9.16667 10.6667H10.8333C11.1095 10.6667 11.3333 10.8905 11.3333 11.1667ZM15.3333 11.1667V12.8333C15.3333 13.1095 15.1095 13.3333 14.8333 13.3333H13.1667C12.8905 13.3333 12.6667 13.1095 12.6667 12.8333V11.1667C12.6667 10.8905 12.8905 10.6667 13.1667 10.6667H14.8333C15.1095 10.6667 15.3333 10.8905 15.3333 11.1667ZM19.3333 11.1667V12.8333C19.3333 13.1095 19.1095 13.3333 18.8333 13.3333H17.1667C16.8905 13.3333 16.6667 13.1095 16.6667 12.8333V11.1667C16.6667 10.8905 16.8905 10.6667 17.1667 10.6667H18.8333C19.1095 10.6667 19.3333 10.8905 19.3333 11.1667ZM5.33333 15.1667V16.8333C5.33333 17.1095 5.10946 17.3333 4.83333 17.3333H3.16667C2.89054 17.3333 2.66667 17.1095 2.66667 16.8333V15.1667C2.66667 14.8905 2.89054 14.6667 3.16667 14.6667H4.83333C5.10946 14.6667 5.33333 14.8905 5.33333 15.1667ZM17.3333 15.1667V16.8333C17.3333 17.1095 17.1095 17.3333 16.8333 17.3333H7.16667C6.89054 17.3333 6.66667 17.1095 6.66667 16.8333V15.1667C6.66667 14.8905 6.89054 14.6667 7.16667 14.6667H16.8333C17.1095 14.6667 17.3333 14.8905 17.3333 15.1667ZM21.3333 15.1667V16.8333C21.3333 17.1095 21.1095 17.3333 20.8333 17.3333H19.1667C18.8905 17.3333 18.6667 17.1095 18.6667 16.8333V15.1667C18.6667 14.8905 18.8905 14.6667 19.1667 14.6667H20.8333C21.1095 14.6667 21.3333 14.8905 21.3333 15.1667Z"></path>
                <path d="M24 3.5L21.2624 6.50209H24V8H19V6.61088L21.476 3.49791H19.0349V2H24V3.5Z" fill="currentColor" mask="url(#_)"></path>
                {!isEnabled && <>
                    <mask id="_">
                        <path fill="#fff" d="M0 0h24v24H0Z"></path>
                        <path stroke="#000" stroke-width="5.99068" d="M0 24 24 0"></path>
                    </mask>
                    <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z"></path>
                </>}
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SilentTyping",
    authors: [Devs.Ven, Devs.Rini],
    description: "Hide that you are typing",
    dependencies: ["CommandsAPI", "ChatInputButtonAPI"],
    settings,

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
