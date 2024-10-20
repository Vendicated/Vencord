/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings, Settings } from "@api/Settings";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin, { OptionType } from "@utils/types";
import { checkForUpdates, checkImportantUpdate, update, UpdateLogger } from "@utils/updater";
import { GuildChannelStore, MessageStore } from "@webpack/common";

var update_found = false;

const settings = definePluginSettings({
    serverStyling: {
        type: OptionType.BOOLEAN,
        description: "Enable server styles.",
        default: true
    },
    serverBlockList: {
        type: OptionType.STRING,
        description: "List of server IDs to block. (server styling)",
        default: ""
    },
    messageBlockList: {
        type: OptionType.STRING,
        description: "List of message IDs to block. (server styling)",
        default: ""
    }
});

export default definePlugin({
    name: "ZoidCore",
    description: "Extra core functions for Nexulien",
    nexulien: true,
    authors: [Devs.Zoid],
    required: true,

    settings,

    flux: {
        async CHANNEL_SELECT({ channelId, guildId }) {
            if (settings.store.serverBlockList.includes(guildId) || !settings.store.serverStyling) return;
            const oldClasses = Array.from(document.body.classList);
            oldClasses.filter(c => c.startsWith("guild-") || c.startsWith("channel-")).forEach(c => document.body.classList.remove(c));
            if (channelId) {
                document.body.classList.add(`guild-${guildId}`, `channel-${channelId}`);
            }
            document.querySelector(".nexulien-server-style")?.remove();
            GuildChannelStore.getChannels(guildId).SELECTABLE.forEach(c => {
                if (c.channel.name === "nexulien-config") {
                    console.log("Found config channel, updating css...");
                    const style = document.createElement("style");
                    style.className = "nexulien-server-style";
                    let styleText = "";
                    MessageStore.getMessages(c.channel.id).forEach(m => {
                        if (settings.store.messageBlockList.includes(m.id)) return;
                        const cssCodeblockRegex = /```css([\s\S]*?)```/;
                        const match = m.content.match(cssCodeblockRegex);

                        if (match) {
                            styleText += match[1].trim() + "\n\n";
                        }
                    });
                    style.textContent = styleText;
                    document.head.appendChild(style);
                    return;
                }
            });

        }
    },
    start() {
        setInterval(async function () {
            if (!IS_WEB && !IS_UPDATER_DISABLED) {
                console.info("ZoidCore: Checking for updates...");
                try {
                    const isOutdated = await checkForUpdates();
                    if (!isOutdated) return;
                    const isImportant = await checkImportantUpdate();

                    update_found = true;

                    if (Settings.autoUpdate || isImportant) {
                        await update();
                        if (Settings.autoUpdateNotification && !isImportant)
                            if (!update_found) {
                                setTimeout(() => showNotification({
                                    title: "Nexulien has been updated!",
                                    body: "Click here to restart",
                                    permanent: true,
                                    noPersist: true,
                                    onClick: relaunch
                                }), 10_000);
                            }
                        if (isImportant) {
                            setTimeout(() => {
                                showNotification({
                                    title: "Nexulien has been updated!",
                                    body: "Important update prioritized, restarting in 5 seconds.",
                                    permanent: true,
                                    noPersist: true,
                                });
                                setTimeout(() => relaunch(), 5_000);
                            }, 10_000);
                        }
                        return;
                    }

                    setTimeout(() => showNotification({
                        title: "A Nexulien update is available!",
                        body: "Click here to view the update",
                        permanent: true,
                        noPersist: true,
                        onClick: openUpdaterModal!
                    }), 10_000);
                } catch (err) {
                    UpdateLogger.error("Failed to check for updates", err);
                }
            }
        }, 300000);
    },
});

