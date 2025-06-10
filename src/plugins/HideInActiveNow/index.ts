/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";

import { contextMenus, isGuildBlacklisted, isUserBlacklisted, ResetButton } from "./activeNowIgnoreList";

enum ActiveNowHideIgnoredSettings {
    Off,
    HideServer,
    HideUser,
}


// const logger = new Logger("ActiveNowHideIgnored");
export const settings = definePluginSettings({
    hideActiveNow: {
        type: OptionType.BOOLEAN,
        description: "How to handle hidden users/ignored users in voice channel in the main Active Now section",
        restartNeeded: true
    },
    whitelistUsers: {
        description: "Turn the blacklist into a whitelist for users, so only the users in the list will be shown",
        type: OptionType.BOOLEAN,
        restartNeeded: false,
    },
    whitelistServers: {
        description: "Turn the blacklist into a whitelist for server, so only the servers in the list will be shown",
        type: OptionType.BOOLEAN,
        restartNeeded: false,
    },
    hideIgnoredUsers: {
        description: "Hide ignored users in the main Active Now section",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    resetData: {
        type: OptionType.COMPONENT,
        description: "Reset all blacklisted/whitelisted users and servers",
        component: ResetButton
    },
});




// it break them yeey
export default definePlugin({
    name: "Active Now Hide Ignored",
    description: "Hides Active Now entries for ignored users.",
    authors: [{ name: "kyrillk", id: 0n }],
    contextMenus,
    settings,
    patches: [
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /{partiedMembers:(\i)(.*)voiceChannels:(\i)(.*),\i=\i\(\)\(\i,\i\);/,
                replace: "$&if($self.anyIgnoredUser($1) || $self.filterIgnoredGuilds($3)){return null;}",
            },
            predicate: () => settings.store.hideActiveNow
        },
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /(\{party:)(\i)(.*?\}=\i)(.*=\i,\i=(\i)(.*),\i=\i\(\)\(\i,\i\);)/,
                replace: "$1unfilter_$2$3,$2=$self.partyFilterIgnoredUsers(unfilter_$2)$4if($5 == 0 || $self.filterIgnoredGuilds($2)){return null;}",
            },
            predicate: () => !settings.store.hideActiveNow
        },
    ],
    isIgnoredUser(user) {
        const userId = user.id || user;
        if (isUserBlacklisted(userId) || (RelationshipStore.isIgnored(userId)) && settings.store.hideIgnoredUsers) {
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
        if (filteredPartyMembers.length === 0) {
            return { ...party, partiedMembers: filteredPartyMembers };
        }
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
        if (isGuildBlacklisted(guild)) {
            return true;
        }
        return false;
    },
    // input can be a array of channels or a party
    filterIgnoredGuilds(input) {
        if (!input) {
            return false;
        }
        var voiceChannels = input.voiceChannels || input;
        return voiceChannels.some(voiceChannel => this.isIgnoredGuild(voiceChannel.guild.id));
    },

});


