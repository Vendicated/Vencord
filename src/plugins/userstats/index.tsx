/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 patryk_patryk_5 and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";

export default definePlugin({
    name: "UserStats",
    authors: [
        {
            id: 0n,
            name: "patryk_patryk_5",
        },
    ],
    description: "This plugin tracks and displays the user's statistics on Vencord.",
    settings: {
        trackSentMessages: {
            type: OptionType.BOOLEAN,
            description: "Track sent messages",
            defaultValue: true
        },
        trackReceivedMessages: {
            type: OptionType.BOOLEAN,
            description: "Track received messages",
            defaultValue: true
        },
        trackOnlineTime: {
            type: OptionType.BOOLEAN,
            description: "Track online time",
            defaultValue: true
        },
        displayLiveStats: {
            type: OptionType.BOOLEAN,
            description: "Display live stats in Discord interface",
            defaultValue: false
        }
    },
    patches: [],
    start() {
        this.incrementSentMessages = function() {
            window.userStats = window.userStats || { sentMessages: 0, receivedMessages: 0, onlineTime: 0 };
            window.userStats.sentMessages += 1;
            if ($self.settings.displayLiveStats) $self.updateLiveStats();
        };

        this.incrementReceivedMessages = function() {
            window.userStats = window.userStats || { sentMessages: 0, receivedMessages: 0, onlineTime: 0 };
            window.userStats.receivedMessages += 1;
            if ($self.settings.displayLiveStats) $self.updateLiveStats();
        };

        this.startOnlineTimer = function() {
            window.userStats = window.userStats || { sentMessages: 0, receivedMessages: 0, onlineTime: 0 };
            window.userStats.loginTime = Date.now();
        };

        this.stopOnlineTimer = function() {
            if (!window.userStats || !window.userStats.loginTime) return;
            const logoutTime = Date.now();
            window.userStats.onlineTime += logoutTime - window.userStats.loginTime;
            delete window.userStats.loginTime;
            if ($self.settings.displayLiveStats) $self.updateLiveStats();
        };

        this.displayStats = function() {
            if (!window.userStats) return 'No stats available.';
            const onlineTimeInHours = (window.userStats.onlineTime / (1000 * 60 * 60)).toFixed(2);
            return `Sent Messages: ${window.userStats.sentMessages}, Received Messages: ${window.userStats.receivedMessages}, Online Time: ${onlineTimeInHours} hours`;
        };

        this.updateLiveStats = function() {
            // This function should update the live stats in the Discord interface.
            // The implementation depends on the structure of the Discord interface and may require additional patches.
        };

        this.resetStats = function() {
            window.userStats = { sentMessages: 0, receivedMessages: 0, onlineTime: 0 };
        };
    },
    stop() {},
});
