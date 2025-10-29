/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Alerts, ChannelStore, SelectedChannelStore } from "@webpack/common";

const PrivateChannelActions = findByPropsLazy("closePrivateChannel");

const settings = definePluginSettings({
    confirmGroupDMLeave: {
        type: OptionType.BOOLEAN,
        description: "Show confirmation dialog before leaving group DMs",
        default: true
    }
});

export default definePlugin({
    name: "CloseDMsWithCtrlW",
    description: "Closes the current DM when pressing Ctrl + W",
    authors: [Devs.IamSwan],
    settings,

    alertOpen: false,

    start() {
        this.handleKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "w") {
                e.preventDefault();

                // Don't process if an alert is already open
                if (this.alertOpen) return;

                const channelId = SelectedChannelStore.getChannelId();
                const channel = ChannelStore.getChannel(channelId);

                if (channel?.isDM())
                    PrivateChannelActions.closePrivateChannel(channelId);

                if (channel?.isGroupDM()) {
                    if (settings.store.confirmGroupDMLeave) {
                        const groupName = channel.name || "this group";

                        this.alertOpen = true;

                        Alerts.show({
                            title: "Leave Group",
                            body: `Are you sure you want to leave ${groupName}? You won't be able to rejoin unless you are re-invited.`,
                            confirmText: "Leave Group",
                            cancelText: "Cancel",
                            onConfirm: () => {
                                PrivateChannelActions.closePrivateChannel(channelId);
                                this.alertOpen = false;
                            },
                            onCancel: () => {
                                this.alertOpen = false;
                            },
                            onCloseCallback: () => {
                                this.alertOpen = false;
                            }
                        });
                    } else {
                        PrivateChannelActions.closePrivateChannel(channelId);
                    }
                }
            }
        };

        window.addEventListener("keydown", this.handleKey);
    },

    stop() {
        window.removeEventListener("keydown", this.handleKey);
    }
});
