/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";

import { contextMenus, isGuildBlacklisted, isUserBlacklisted, ResetButton } from "./activeNowIgnoreList";

// const logger = new Logger("ActiveNowHideIgnored");
export const settings = definePluginSettings({
    hideActiveNow: {
        type: OptionType.BOOLEAN,
        description: "Hide/Show servers instead of just users in the Active Now section",
        default: false,
        restartNeeded: false
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
    authors: [Devs.Kyrillk],
    contextMenus,
    settings,
    patches: [
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /(\{party:)(\i)(.*?\}=\i)(.*,\i=\i\(\)\(\i,\i\);)/,
                replace: "$1unfilter_$2$3,$2=$self.partyFilterIgnoredUsers(unfilter_$2)$4if($self.shoudBeNull($2)){return null;}",
            },
            predicate: () => !settings.store.hideActiveNow
        },
    ],
    partyFilterIgnoredUsers,
    shoudBeNull,
});


function isIgnoredUser(user) {
    const userId = user.id || user;
    if (isUserBlacklisted(userId) || (RelationshipStore.isIgnored(userId)) && settings.store.hideIgnoredUsers) {
        return true;
    }
    return false;
}
function anyIgnoredUser(users) {
    return users.some(user => isIgnoredUser(user));
}
// party functions

function partyFilterIgnoredUsers(party) {


    var filteredPartyMembers = party.partiedMembers.filter(user => !isIgnoredUser(user));
    var filteredPartyMembersLength = filteredPartyMembers.length;
    if (filteredPartyMembersLength === 0) return { ...party, partiedMembers: [] };

    if (settings.store.hideActiveNow) {
        if (settings.store.whitelistUsers) return party;
        if (filteredPartyMembersLength !== party.partiedMembers.length) return { ...party, partiedMembers: [] };
    }



    const filteredParty = {
        ...party,
        partiedMembers: filteredPartyMembers,

        currentActivities: party.currentActivities
            .map(activity => activityFilterIgnoredUsers(activity))
            .filter(activity => activity !== null && activity !== undefined),
        priorityMembers: party.priorityMembers
            .map(priorityMember => priorityMembersFilterIgnoredUsers(party.priorityMembers, priorityMember, filteredPartyMembers))
            .filter(priorityMember => priorityMember !== null && priorityMember !== undefined),
        voiceChannels: party.voiceChannels
            .map(voiceChannel => voiceChannelFilterIgnoredUsers(voiceChannel))
            .filter(voiceChannel => voiceChannel !== null && voiceChannel !== undefined),
    };
    return filteredParty;
}

// needed?
function activityFilterIgnoredUsers(activity) {
    var filteredActivityUser = activity.activityUser;
    var filteredPlayingMembers = activity.playingMembers.filter(user => !isIgnoredUser(user));
    if (isIgnoredUser(activity.activityUser)) {
        if (filteredPlayingMembers.length === 0) {
            return null;
        } else if (isIgnoredUser(activity.activityUser)) {
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
}

function priorityMembersFilterIgnoredUsers(priorityMembers, priorityMember, partiedMembers) {
    var filteredUser = priorityMember.user;
    if (isIgnoredUser(filteredUser)) {
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
}

function voiceChannelFilterIgnoredUsers(voiceChannel) {
    const filteredVoiceChannel = {
        ...voiceChannel,
        members: voiceChannel.members.filter(user => !isIgnoredUser(user)),
        voiceStates: Object.fromEntries(
            Object.entries(voiceChannel.voiceStates).filter(([userId]) =>
                !isIgnoredUser({ id: userId })
            )
        )
    };
    return filteredVoiceChannel;
}
// guild functions


function isIgnoredGuild(guild) {
    if (isGuildBlacklisted(guild)) {
        return true;
    }
    return false;
}
// input can be a array of channels or a party
function filterIgnoredGuilds(input) {
    if (!input) {
        return false;
    }
    var voiceChannels = input.voiceChannels || input;
    return voiceChannels.some(voiceChannel => isIgnoredGuild(voiceChannel.guild.id));
}

// backes Active Now null / not apear
function shoudBeNull(party) {
    if (!party) return true;
    if (party.partiedMembers.length === 0 || filterIgnoredGuilds(party)) return true;
    return false;
}

