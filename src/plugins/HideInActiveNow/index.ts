/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";

enum ActiveNowHideIgnoredSettings {
    Off,
    HideServer,
    HideUser
}


// const logger = new Logger("ActiveNowHideIgnored");
const settings = definePluginSettings({
    hideActiveNow: {
        type: OptionType.SELECT,
        description: "How to handle ignored users/ignored users in voice channel in the main Active Now section",
        options: [
            { label: "hide user", value: ActiveNowHideIgnoredSettings.HideUser, default: true },
            { label: "hide server", value: ActiveNowHideIgnoredSettings.HideServer },
            { label: "off", value: ActiveNowHideIgnoredSettings.Off }
        ],
        restartNeeded: true
    },
    hideIgnoredUsers: {
        description: "Hide ignored users in the main Active Now section",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    ignoredUsers: {
        description: "List of user IDs to hide from Active Now (one per line)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
    ignoredGuilds: {
        description: "List of guild IDs to hide from Active Now (one per line)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
});


// it break them yeey
export default definePlugin({
    name: "Active Now Hide Ignored",
    description: "Hides Active Now entries for ignored users.",
    authors: [{ name: "kyrillk", id: 0n }],

    patches: [
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /{partiedMembers:(\i)(.*)voiceChannels:(\i)(.*),\i=\i\(\)\(\i,\i\);/,
                replace: "$&if($self.anyIgnoredUser($1) || $self.filterIgnoredGuilds($3)){return null;}",
            },
            predicate: () => settings.store.hideActiveNow === ActiveNowHideIgnoredSettings.HideServer
        },
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /(\{party:)(\i)(.*?\}=\i)(.*=\i,\i=(\i)(.*),\i=\i\(\)\(\i,\i\);)/,
                replace: "$1unfilter_$2$3,$2=$self.partyFilterIgnoredUsers(unfilter_$2)$4if($5 == 0 || $self.filterIgnoredGuilds($2)){return null;} console.log('Active Now Hide Ignored: Party Filtered', $2);",
            },
            predicate: () => settings.store.hideActiveNow === ActiveNowHideIgnoredSettings.HideUser
        },
    ],
    settings,
    isIgnoredUser(user) {
        const ignoredUsers = (settings.store.ignoredUsers || "");
        const userId = user.id || user;
        if (ignoredUsers.includes(userId) || (RelationshipStore.isIgnored(userId) && settings.store.hideIgnoredUsers)) {
            return true;
        }
        return false;
    },
    anyIgnoredUser(users) {
        return users.some(user => this.isIgnoredUser(user));
    },
    // party functions

    partyFilterIgnoredUsers(party) {
        var filteredPartyMembers = party.partiedMembers.filter(user => !this.isIgnoredUser(user));
        const filteredParty = {
            ...party,
            partiedMembers: filteredPartyMembers,

            currentActivities: party.currentActivities
                .map(activity => this.activityFilterIgnoredUsers(activity))
                .filter(activity => activity !== null && activity !== undefined),
            priorityMembers: party.priorityMembers
                .map(priorityMember => this.priorityMembersFilterIgnoredUsers(party.priorityMembers, priorityMember, filteredPartyMembers))
                .filter(priorityMember => priorityMember !== null && priorityMember !== undefined),
            voiceChannels: party.voiceChannels
                .map(voiceChannel => this.voiceChannelFilterIgnoredUsers(voiceChannel))
                .filter(voiceChannel => voiceChannel !== null && voiceChannel !== undefined),
        };
        return filteredParty;
    },

    // needed?
    activityFilterIgnoredUsers(activity) {
        var filteredActivityUser = activity.activityUser;
        var filteredPlayingMembers = activity.playingMembers.filter(user => !this.isIgnoredUser(user));
        if (this.isIgnoredUser(activity.activityUser)) {
            if (filteredPlayingMembers.length === 0) {
                return null;
            } else if (this.isIgnoredUser(activity.activityUser)) {
                filteredActivityUser = filteredPlayingMembers[0];
            }
        }

        // change to Const when fixed
        var filteredActivity = {
            ...activity,
            activityUser: filteredActivityUser,
            playingMembers: filteredPlayingMembers,
        };
        return filteredActivity;
    },


    priorityMembersFilterIgnoredUsers(priorityMembers, priorityMember, partiedMembers) {
        var filteredUser = priorityMember.user;
        if (this.isIgnoredUser(filteredUser)) {
            if (partiedMembers.length === 1) {
                return null;
            }
            filteredUser = partiedMembers.find(user => !priorityMembers.some(pm => pm.user.id === user.id));

            if (!filteredUser) {
                return null;
            }
        }
        const filteredPriorityMember = {
            ...priorityMember,
            user: filteredUser,
        };
        return filteredPriorityMember;
    },

    voiceChannelFilterIgnoredUsers(voiceChannel) {
        const filteredVoiceChannel = {
            ...voiceChannel,
            members: voiceChannel.members.filter(user => !this.isIgnoredUser(user)),
            voiceStates: Object.fromEntries(
                Object.entries(voiceChannel.voiceStates).filter(([userId]) =>
                    !this.isIgnoredUser({ id: userId })
                )
            )
        };
        return filteredVoiceChannel;
    },
    // guild functions


    isIgnoredGuild(guild) {
        const ignoredGuilds = (settings.store.ignoredGuilds || "");
        if (ignoredGuilds.includes(guild)) {
            return true;
        }
        return false;
    },
    // input can be a array of channels or a party
    filterIgnoredGuilds(input) {
        if (!settings.store.hideActiveNowGuilds || !input) {
            return false;
        }
        var voiceChannels = input.voiceChannels || input;
        return voiceChannels.some(voiceChannel => this.isIgnoredGuild(voiceChannel.guild.id));
    },

});


