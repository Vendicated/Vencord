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
    authors: [Devs.patryk_patryk_5],
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
    userStats: { sentMessages: 0, receivedMessages: 0, onlineTime: 0 },
    incrementSentMessages() {
        this.userStats.sentMessages += 1;
        if (this.settings.displayLiveStats) this.updateLiveStats();
    },
    incrementReceivedMessages() {
        this.userStats.receivedMessages += 1;
        if (this.settings.displayLiveStats) this.updateLiveStats();
    },
    startOnlineTimer() {
        this.userStats.loginTime = Date.now();
    },
    stopOnlineTimer() {
        if (!this.userStats || !this.userStats.loginTime) return;
        const logoutTime = Date.now();
        this.userStats.onlineTime += logoutTime - this.userStats.loginTime;
        delete this.userStats.loginTime;
        if (this.settings.displayLiveStats) this.updateLiveStats();
    },
    displayStats() {
        if (!this.userStats) return 'No stats available.';
        const onlineTimeInHours = (this.userStats.onlineTime / (1000 * 60 * 60)).toFixed(2);
        return `Sent Messages: ${this.userStats.sentMessages}, Received Messages: ${this.userStats.receivedMessages}, Online Time: ${onlineTimeInHours} hours`;
    },
    updateLiveStats() {
        // This function should update the live stats in the Discord interface.
        // The implementation depends on the structure of the Discord interface and may require additional patches.
    },
    resetStats() {
        this.userStats = { sentMessages: 0, receivedMessages: 0, onlineTime: 0 };
    },
    start() {},
    stop() {},
});
