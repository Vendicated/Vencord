
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByProps, findByPropsLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, PermissionsBits, PermissionStore, VoiceStateStore, Menu, RestAPI, showToast } from "@webpack/common";
import { Devs } from "@utils/constants";
import { strings } from "./strings";
import { React } from "@webpack/common";

const locale = findByPropsLazy("getLocale");

function getString(key: keyof typeof strings["en-US"]) {
    const lang = locale.getLocale();
    const langShort = lang.split("-")[0];
    return strings[lang]?.[key] ?? strings[langShort]?.[key] ?? strings["en-US"][key];
}

export default definePlugin({
    name: "DisconnectAll",
    description: "Adds a button to disconnect all users from a voice channel.",
    authors: [Devs.mockqv],
    contextMenus: {
        "channel-context": (children, { channel }) => {
            if (!channel.isGuildVoice()) return;

            const canDisconnect = PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel);
            if (!canDisconnect) return;

            const menuItem = React.createElement(Menu.MenuItem, {
                id: "disconnect-all",
                label: getString("DISCONNECT_ALL"),
                color: "danger",
                action: async () => {
                    const voiceStates = VoiceStateStore.getVoiceStatesForChannel(channel.id);
                    let disconnectedCount = 0;
                    for (const userId in voiceStates) {
                        try {
                            await RestAPI.patch({
                                url: `/guilds/${channel.guild_id}/members/${userId}`,
                                body: { channel_id: null }
                            });
                            disconnectedCount++;
                        } catch (error) {
                            console.error(`Vencord disconnectAll: Failed to disconnect user ${userId}:`, error);
                        }
                    }
                    if (disconnectedCount > 0) {
                        showToast(getString("DISCONNECTED_ALL_USERS").replace("%d", disconnectedCount.toString()), "success");
                    }
                }
            });

            children.push(menuItem);
        }
    },
    start() {
    },
    stop() {
    }
});
