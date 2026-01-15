/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

import settings from "./settings";
import { RelationshipStore } from "./stores";

const { getBlockedUsersForVoiceChannel, getIgnoredUsersForVoiceChannel } = findByPropsLazy("getBlockedUsersForVoiceChannel", "getIgnoredUsersForVoiceChannel");

export default definePlugin({
    name: "rzBypassBlockedOrIgnored",
    description: "Bypass the blocked or ignored user modal if is present in voice channels.",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],
    settings,
    patches: [
        {
            find: "async handleVoiceConnect(",
            replacement: {
                match: /async handleVoiceConnect\((\i)\){/,
                replace: "async handleVoiceConnect($1){$self.handleVoiceConnect($1);"
            }
        },
        {
            find: "{handleBlockedOrIgnoredUserVoiceChannelJoin(",
            replacement: {
                match: /{handleBlockedOrIgnoredUserVoiceChannelJoin\((\i),(\i)\){/,
                replace: "{handleBlockedOrIgnoredUserVoiceChannelJoin($1,$2){if($self.handleBlockedOrIgnoredUserVoiceChannelJoin($1,$2))return;"
            }
        }
    ],
    start: () => {
    },
    stop: () => {
    },

    handleVoiceConnect(...args) {
        if (!settings.store.bypassWhenJoining) return;

        const channelId = args[0].channel.id;
        args[0].bypassBlockedWarningModal = this.shouldBypass(channelId);
    },

    handleBlockedOrIgnoredUserVoiceChannelJoin(...args) {
        if (!settings.store.bypassWhenUserJoins) return;

        const userId = args[1];

        if (settings.store.bypassIgnoredUsersModal && RelationshipStore.isIgnored(userId)
            || settings.store.bypassBlockedUsersModal && RelationshipStore.isBlocked(userId)) {
            return true;
        }
    },

    shouldBypass(channelId) {
        const shouldBypassBlocked = settings.store.bypassBlockedUsersModal;
        const hasBlockedUsers = getBlockedUsersForVoiceChannel(channelId).size;
        const shouldBypassIgnored = settings.store.bypassIgnoredUsersModal;
        const hasIgnoredUsers = getIgnoredUsersForVoiceChannel(channelId).size;

        return shouldBypassBlocked && hasBlockedUsers && shouldBypassIgnored
            || !hasBlockedUsers && shouldBypassIgnored && hasIgnoredUsers
            || shouldBypassBlocked && hasBlockedUsers && !hasIgnoredUsers;
    }
});

