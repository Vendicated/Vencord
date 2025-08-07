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

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { openPluginModal } from "@components/index";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { ChannelStore, FluxDispatcher, Menu, React } from "@webpack/common";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Toggle functionality of your own typing indicator globally.",
        default: true,
    },
    hideChatBoxTypingIndicators: {
        type: OptionType.BOOLEAN,
        description: "Hide other users' typing indicators from above the chat bar.",
        default: false,
    },
    hideMembersListTypingIndicators: {
        type: OptionType.BOOLEAN,
        description: "Hide other users' typing indicators from the members list.",
        default: false,
    },
    chatIcon: {
        type: OptionType.BOOLEAN,
        description: "Show an icon in the chat bar for modifying the plugin on the go.",
        default: true,
    },
    chatIconLeftClickAction: {
        type: OptionType.SELECT,
        description: "What to do when left clicking the chat icon.",
        options: [
            { label: "Toggle Plugin Functionality", value: "global" },
            { label: "Toggle Typing in Channel", value: "channel", default: true },
            { label: "Toggle Typing in Guild", value: "guild" },
            { label: "Open Plugin Settings", value: "settings" }
        ]
    },
    chatIconMiddleClickAction: {
        type: OptionType.SELECT,
        description: "What to do when middle clicking the chat icon.",
        options: [
            { label: "Toggle Plugin Functionality", value: "global" },
            { label: "Toggle Typing in Channel", value: "channel" },
            { label: "Toggle Typing in Guild", value: "guild" },
            { label: "Open Plugin Settings", value: "settings", default: true }
        ]
    },
    chatIconRightClickAction: {
        type: OptionType.SELECT,
        description: "What to do when right clicking the chat icon.",
        options: [
            { label: "Toggle Plugin Functionality", value: "global", default: true },
            { label: "Toggle Typing in Channel", value: "channel" },
            { label: "Toggle Typing in Guild", value: "guild" },
            { label: "Open Plugin Settings", value: "settings" }
        ]
    },
    chatContextMenu: {
        type: OptionType.BOOLEAN,
        description: "Show a dropdown in the chat context menu to modify plugin settings on the go.",
        default: true
    },
    defaultHidden: {
        type: OptionType.BOOLEAN,
        description: "If enabled, the plugin will hide your typing from others in any DMs/channels/guilds not listed in \"Disabled Locations\" below. If disabled, the plugin will show your typing to others for any DMs/channels/guilds not listed in \"Enabled Locations\" below.",
        default: true,
    },
    enabledLocations: {
        type: OptionType.STRING,
        description: "Enable functionality for these IDs. Accepts a comma separated list of DM IDs, channel IDs, and guild IDs. Only used if \"Default Hidden\" is disabled.",
        default: "",
    },
    disabledLocations: {
        type: OptionType.STRING,
        description: "Disable functionality for these IDs. Accepts a comma separated list of DM IDs, channel IDs, and guild IDs. Only used if \"Default Hidden\" is enabled.",
        default: "",
    },
});

function toggleGlobal(): void {
    settings.store.enabled = !settings.store.enabled;
}

function toggleLocation(locationId: string, effectiveList: string[], defaultHidden: boolean): void {
    if (effectiveList.includes(locationId)) {
        effectiveList.splice(effectiveList.indexOf(locationId), 1);
    } else {
        effectiveList.push(locationId);
    }

    if (defaultHidden) {
        settings.store.disabledLocations = effectiveList.join(", ");
    } else {
        settings.store.enabledLocations = effectiveList.join(", ");
    }
}

const SilentTypingChatToggle: ChatBarButtonFactory = ({ channel, type }) => {
    const {
        enabled,
        chatIcon,
        defaultHidden,
        enabledLocations,
        disabledLocations,
        chatIconLeftClickAction,
        chatIconMiddleClickAction,
        chatIconRightClickAction,
    } = settings.use([
        "enabled",
        "chatIcon",
        "defaultHidden",
        "enabledLocations",
        "disabledLocations",
        "chatIconLeftClickAction",
        "chatIconMiddleClickAction",
        "chatIconRightClickAction",
    ]);

    const validChat = ["normal", "sidebar"].some(x => type.analyticsName === x);

    if (!validChat || !chatIcon) return null;

    const effectiveList = getEffectiveList();
    const enabledLocally = enabled && checkEnabled(channel);
    const location = channel.guild_id && effectiveList.includes(channel.guild_id) ? "Guild" : effectiveList.includes(channel.id) ? "Channel" : "Global";

    const tooltip = enabled ? (
        enabledLocally ? `Typing Hidden (${location})` : `Typing Visible (${location})`
    ) : "Typing Visible (Global)";

    function performAction(action: string): void {
        switch (action) {
            case "global":
                toggleGlobal();
                break;
            case "channel":
                toggleLocation(channel.id, effectiveList, defaultHidden);
                break;
            case "guild":
                channel.guild_id ? toggleLocation(channel.guild_id, effectiveList, defaultHidden) : null;
                break;
            case "settings":
                openPluginModal(Vencord.Plugins.plugins.SilentTyping);
                break;
        }
    }

    return (
        <ChatBarButton
            tooltip={tooltip}
            onClick={e => {
                if (e.button === 0) {
                    performAction(settings.store.chatIconLeftClickAction);
                }
            }}
            onAuxClick={e => {
                if (e.button === 1) {
                    performAction(settings.store.chatIconMiddleClickAction);
                }
            }}
            onContextMenu={e => {
                if (e.button === 2) {
                    performAction(settings.store.chatIconRightClickAction);
                }
            }}>
            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ scale: "1.2" }}>
                <path fill="currentColor" mask="url(#silent-typing-msg-mask)" d="M18.333 15.556H1.667a1.667 1.667 0 0 1 -1.667 -1.667v-10a1.667 1.667 0 0 1 1.667 -1.667h16.667a1.667 1.667 0 0 1 1.667 1.667v10a1.667 1.667 0 0 1 -1.667 1.667M4.444 6.25V4.861a0.417 0.417 0 0 0 -0.417 -0.417H2.639a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417H5.973a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V4.861a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V6.25a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m-11.667 3.333V8.194a0.417 0.417 0 0 0 -0.417 -0.417H4.306a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V8.194a0.417 0.417 0 0 0 -0.417 -0.417H7.639a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V8.194a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m3.333 0V8.194a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V9.583a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m-11.667 3.333v-1.389a0.417 0.417 0 0 0 -0.417 -0.417H2.639a0.417 0.417 0 0 0 -0.417 0.417V12.917a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417m10 0v-1.389a0.417 0.417 0 0 0 -0.417 -0.417H5.973a0.417 0.417 0 0 0 -0.417 0.417V12.917a0.417 0.417 0 0 0 0.417 0.417h8.056a0.417 0.417 0 0 0 0.417 -0.417m3.333 0v-1.389a0.417 0.417 0 0 0 -0.417 -0.417h-1.389a0.417 0.417 0 0 0 -0.417 0.417V12.917a0.417 0.417 0 0 0 0.417 0.417h1.389a0.417 0.417 0 0 0 0.417 -0.417" transform="translate(2, 3)" />
                {(enabledLocally) && (
                    <>
                        <mask id="silent-typing-msg-mask">
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

function getEffectiveList(): string[] {
    if (settings.store.defaultHidden) {
        if (!settings.store.disabledLocations) {
            settings.store.disabledLocations = "";
            return [];
        } else {
            return settings.store.disabledLocations.split(",").map(x => x.trim()).filter(Boolean);
        }
    } else {
        if (!settings.store.enabledLocations) {
            settings.store.enabledLocations = "";
            return [];
        } else {
            return settings.store.enabledLocations.split(",").map(x => x.trim()).filter(Boolean);
        }
    }
}

function checkEnabled(channel: string | Channel): boolean {
    if (!settings.store.enabled) return false;

    const channelId = typeof channel === "string" ? channel : channel.id;
    const guildId = typeof channel === "string" ? ChannelStore.getChannel(channelId)?.guild_id : channel.guild_id;
    const effectiveChannels = getEffectiveList();

    if (settings.store.defaultHidden) {
        return !effectiveChannels.includes(guildId) && !effectiveChannels.includes(channelId);
    } else {
        return effectiveChannels.includes(guildId) || effectiveChannels.includes(channelId);
    }
}

const ChatBarContextCheckbox: NavContextMenuPatchCallback = children => {
    const {
        chatIcon,
        chatContextMenu,
        enabled,
        defaultHidden,
        hideChatBoxTypingIndicators,
        hideMembersListTypingIndicators
    } = settings.use([
        "chatIcon",
        "chatContextMenu",
        "enabled",
        "defaultHidden",
        "hideChatBoxTypingIndicators",
        "hideMembersListTypingIndicators"
    ]);

    if (!chatContextMenu) return;

    const group = findGroupChildrenByChildId("submit-button", children as (React.ReactElement | null | undefined)[]);

    if (!group) return;

    const idx = group.findIndex(c => c?.props?.id === "submit-button");

    group.splice(idx >= 0 ? idx : 0, 0,
        <Menu.MenuItem id="vc-silent-typing" label="Silent Typing">
            <Menu.MenuCheckboxItem id="vc-silent-typing-enabled" label="Enabled" checked={enabled}
                action={() => settings.store.enabled = !settings.store.enabled} />
            <Menu.MenuCheckboxItem id="vc-silent-typing-chat-bar-indicators" label="Chat Bar Indicators" checked={settings.store.hideChatBoxTypingIndicators}
                action={() => settings.store.hideChatBoxTypingIndicators = !settings.store.hideChatBoxTypingIndicators} />
            <Menu.MenuCheckboxItem id="vc-silent-typing-members-list-indicators" label="Members List Indicators" checked={settings.store.hideMembersListTypingIndicators}
                action={() => settings.store.hideMembersListTypingIndicators = !settings.store.hideMembersListTypingIndicators} />
            <Menu.MenuCheckboxItem id="vc-silent-typing-chat-icon" label="Chat Icon" checked={chatIcon}
                action={() => settings.store.chatIcon = !settings.store.chatIcon} />
            <Menu.MenuCheckboxItem id="vc-silent-typing-default" label="Default Hidden" checked={defaultHidden}
                action={() => settings.store.defaultHidden = !settings.store.defaultHidden} />
        </Menu.MenuItem>
    );
};

function shouldHideChatBarTypingIndicators(): boolean {
    const { hideChatBoxTypingIndicators } = settings.use(["hideChatBoxTypingIndicators"]);
    return hideChatBoxTypingIndicators;
}

function shouldHideMembersListTypingIndicators(): boolean {
    const { hideMembersListTypingIndicators } = settings.use(["hideMembersListTypingIndicators"]);
    return hideMembersListTypingIndicators;
}

export default definePlugin({
    name: "SilentTyping",
    authors: [Devs.Ven, Devs.Rini, Devs.ImBanana, EquicordDevs.Etorix],
    description: "Hide your typing indicator from chat.",
    dependencies: ["ChatInputButtonAPI"],
    settings,

    shouldHideChatBarTypingIndicators,
    shouldHideMembersListTypingIndicators,

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
        {
            find: "activityInviteEducationActivity:",
            group: true,
            replacement: [
                {
                    match: /(let{activityInviteEducationActivity)/,
                    replace: "const silentTypingShouldHideChatBarTypingIndicators=$self.shouldHideChatBarTypingIndicators();$1"
                },
                {
                    match: /(typingDots,ref:\i,children:)(\[.{0,340}?}\)\])/,
                    replace: "$1silentTypingShouldHideChatBarTypingIndicators?[]:$2"
                }
            ]
        },
        {
            find: ",{avatarCutoutX",
            replacement: {
                match: /isTyping:(\i)=!1(,typingIndicatorRef:\i,isSpeaking:)/,
                replace: "silentTypingIsTyping:$1=$self.shouldHideMembersListTypingIndicators()?false:(arguments[0].isTyping??false)$2"
            }
        },
    ],

    commands: [{
        name: "silent-typing",
        description: "Hide your typing indicator from chat.",
        inputType: ApplicationCommandInputType.BUILT_IN,

        options: [
            {
                name: "toggle",
                description: "Toggle functionality globally, for the channel, or for the guild.",
                required: false,
                type: ApplicationCommandOptionType.STRING,
                choices: [
                    { name: "Global", label: "Global", value: "global" },
                    { name: "Channel", label: "Channel", value: "channel" },
                    { name: "Guild", label: "Guild", value: "guild" },
                ]
            },
            {
                name: "chat-bar-indicators",
                description: "Hide other users' typing indicators from above the chat bar.",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
            {
                name: "members-list-indicators",
                description: "Hide other users' typing indicators from the members list.",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
            {
                name: "chat-icon",
                description: "Show an icon in the chat bar for toggling the plugin on the go.",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
            {
                name: "chat-context-menu",
                description: "Show a dropdown in the chat context menu to toggle plugin settings on the go.",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
            {
                name: "default-hidden",
                description: "Whether to hide typing in DMs/channels/guilds by default or not.",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            }
        ],

        execute: async (args, ctx) => {
            let updated = false;
            const location = findOption(args, "toggle");

            if (typeof location === "string") {
                updated = true;

                if (location === "global") {
                    toggleGlobal();
                } else {
                    const locationId = location === "guild" ? ctx.channel.guild_id : ctx.channel.id;
                    toggleLocation(locationId, getEffectiveList(), settings.store.defaultHidden);
                }
            }

            const updateChatIcon = findOption(args, "chat-icon");

            if (typeof updateChatIcon === "boolean") {
                updated = true;
                settings.store.chatIcon = !!updateChatIcon;
            }

            const updateChatContextMenu = findOption(args, "chat-context-menu");

            if (typeof updateChatContextMenu === "boolean") {
                updated = true;
                settings.store.chatContextMenu = !!updateChatContextMenu;
            }

            const updateDefaultHidden = findOption(args, "default-hidden");

            if (typeof updateDefaultHidden === "boolean") {
                updated = true;
                settings.store.defaultHidden = !!updateDefaultHidden;
            }

            sendBotMessage(ctx.channel.id, {
                content: updated ? "Silent typing settings updated." : "No changes made to silent typing settings.",
            });
        },
    }],

    async startTyping(channelId: string) {
        if (checkEnabled(channelId)) return;
        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });
    },

    renderChatBarButton: SilentTypingChatToggle,
});
