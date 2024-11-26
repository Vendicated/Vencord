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
import { ChannelStore, FluxDispatcher, Menu, React } from "@webpack/common";
import { Channel } from "discord-types/general";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Toggle functionality globally. Right click the chat icon to toggle.",
        default: true,
    },
    chatIcon: {
        type: OptionType.BOOLEAN,
        description: "Show an icon in the chat bar for toggling the plugin on the go. Left click to toggle the current channel, middle click to toggle the current guild, and right click to toggle globally.",
        default: true,
    },
    chatContextMenu: {
        type: OptionType.BOOLEAN,
        description: "Show a dropdown in the chat context menu to toggle plugin settings on the go.",
        default: true
    },
    defaultHidden: {
        type: OptionType.BOOLEAN,
        description: "If enabled, the plugin will hide typing in any DMs/channels/guilds not listed in \"Disabled Locations\" below. If disabled, the plugin will show typing for any DMs/channels/guilds not listed in \"Enabled Locations\" below.",
        default: true,
    },
    enabledLocations: {
        type: OptionType.STRING,
        description: "Enable functionality for these IDs. Accepts a comma separated list of DMs (User IDs), channel IDs, and guild IDs. Only used if \"Default Hidden\" is disabled.",
        default: "",
    },
    disabledLocations: {
        type: OptionType.STRING,
        description: "Disable functionality for these IDs. Accepts a comma separated list of DMs (User IDs), channel IDs, and guild IDs. Only used if \"Default Hidden\" is enabled.",
        default: "",
    },
});

const toggleGlobal = () => {
    settings.store.enabled = !settings.store.enabled;
};

const toggleLocation = (locationId: string, effectiveList: string[], defaultHidden: boolean) => {
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
};

const SilentTypingChatToggle: ChatBarButton = ({ channel, type }) => {
    const { enabled, chatIcon, defaultHidden, enabledLocations, disabledLocations } = settings.use(["enabled", "chatIcon", "defaultHidden", "enabledLocations", "disabledLocations"]);
    const validChat = ["normal", "sidebar"].some(x => type.analyticsName === x);

    if (!validChat || !chatIcon) return null;

    const effectiveList = getEffectiveList();
    const enabledLocally = enabled && checkEnabled(channel);
    const location = channel.guild_id && effectiveList.includes(channel.guild_id) ? "Guild" : effectiveList.includes(channel.id) ? "Channel" : "Global";

    const tooltip = enabled ? (
        enabledLocally ? `Typing Hidden (${location})` : `Typing Visible (${location})`
    ) : "Plugin Disabled";

    return (
        <ChatBarButton
            tooltip={tooltip}
            onClick={e => {
                if (e.button === 0) {
                    toggleLocation(channel.id, effectiveList, defaultHidden);
                }
            }}
            onAuxClick={e => {
                if (e.button === 1 && channel.guild_id) {
                    toggleLocation(channel.guild_id, effectiveList, defaultHidden);
                }
            }}
            onContextMenu={e => {
                if (e.button === 2) {
                    toggleGlobal();
                }
            }}>
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ scale: "1.2" }}>
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

const getEffectiveList = () => {
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
};

const checkEnabled = (channel: string | Channel) => {
    if (!settings.store.enabled) return false;

    const channelId = typeof channel === "string" ? channel : channel.id;
    const guildId = typeof channel === "string" ? ChannelStore.getChannel(channelId)?.guild_id : channel.guild_id;
    const effectiveChannels = getEffectiveList();

    if (settings.store.defaultHidden) {
        return !effectiveChannels.includes(guildId) && !effectiveChannels.includes(channelId);
    } else {
        return effectiveChannels.includes(guildId) || effectiveChannels.includes(channelId);
    }
};

const ChatBarContextCheckbox: NavContextMenuPatchCallback = children => {
    const { chatIcon, chatContextMenu, enabled, defaultHidden } = settings.use(["chatIcon", "chatContextMenu", "enabled", "defaultHidden"]);
    if (!chatContextMenu) return;

    const group = findGroupChildrenByChildId("submit-button", children);

    if (!group) return;

    const idx = group.findIndex(c => c?.props?.id === "submit-button");

    group.splice(idx >= 0 ? idx : 0, 0,
        <Menu.MenuItem id="vc-silent-typing" label="Silent Typing">
            <Menu.MenuCheckboxItem id="vc-silent-typing-enabled" label="Enabled" checked={enabled}
                action={() => settings.store.enabled = !settings.store.enabled} />
            <Menu.MenuCheckboxItem id="vc-silent-typing-chat-icon" label="Chat Icon" checked={chatIcon}
                action={() => settings.store.chatIcon = !settings.store.chatIcon} />
            <Menu.MenuCheckboxItem id="vc-silent-typing-default" label="Default Hidden" checked={defaultHidden}
                action={() => settings.store.defaultHidden = !settings.store.defaultHidden} />
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "SilentTyping",
    authors: [Devs.Ven, Devs.ImBanana, Devs.Etorix],
    description: "Hide your typing indicator from chat.",
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

    start: () => addChatBarButton("SilentTyping", SilentTypingChatToggle),
    stop: () => removeChatBarButton("SilentTyping"),
});
