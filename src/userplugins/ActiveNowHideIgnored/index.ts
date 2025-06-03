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
    hideActiveNowGuilds: {
        type: OptionType.BOOLEAN,
        description: "Hide entire voice channels from ignored servers in Active Now",
        restartNeeded: true
    },
    hideFriendsList: {
        description: "Hide Active Now entries for ignored users in the friends list",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
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
    }
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
                match: /{partiedMembers:(\i)(.*),\i=\i\(\)\(\i,\i\);/,
                replace: "$&if($self.anyIgnored($1)){return null;}",
            },
            predicate: () => settings.store.hideActiveNow === ActiveNowHideIgnoredSettings.HideUser
        },
        {
            find: "NOW_PLAYING_CARD_HOVERED,",
            replacement: {
                match: /(\{party:)(\i)(.*?\}=\i)/,
                replace: "$1unfilter$2$3,$2=$self.partyFilterIgnoredUsers(unfilter$2)"
            },
            predicate: () => settings.store.hideActiveNow === ActiveNowHideIgnoredSettings.HideServer
        },
        {
            find: "}=this.state,{children:",
            replacement: {
                match: /user:(\i)(.*)this.props;/,
                replace: "$&if($self.isIgnoredUser($1)){return null;}",
            },
            predicate: () => settings.store.hideFriendsList
        },

    ],
    settings,
    isIgnoredUser(user) {
        const ignoredUsers = (settings.store.ignoredUsers || "");
        const userId = user.id || user;
        if (ignoredUsers.includes(userId) || RelationshipStore.isIgnored(userId)) {
            return true;
        }
        return false;
    },
    anyIgnored(users) {
        return users.some(user => this.isIgnoredUser(user));
    },
    // party functions

    partyFilterIgnoredUsers(party) {
        var filteredPartyMembers = party.partiedMembers.filter(user => !this.isIgnoredUser(user));
        const filteredParty = {
            ...party,
            partiedMembers: filteredPartyMembers,

            currentActivities: party.currentActivities
                .map(activity => this.activityFilterIgnoredUsers(activity, filteredPartyMembers))
                .filter(activity => activity !== null && activity !== undefined),
            priorityMembers: party.priorityMembers
                .map(priorityMember => this.priorityMembersFilterIgnoredUsers(priorityMember, filteredPartyMembers))
                .filter(priorityMember => priorityMember !== null && priorityMember !== undefined),
            voiceChannels: party.voiceChannels
                .map(voiceChannel => this.voiceChannelFilterIgnoredUsers(voiceChannel))
                .filter(voiceChannel => voiceChannel !== null && voiceChannel !== undefined),
        };
        console.log("filterIgnoredUsers", filteredParty);
        return filteredParty;
    },

    activityFilterIgnoredUsers(activity, partiedMembers) {
        if (this.isIgnoredUser(activity.activityUser) && partiedMembers.length > 0) {
            return null;
        }
        return activity;
    },

    priorityMembersFilterIgnoredUsers(priorityMember, partiedMembers) {
        var filteredUser = priorityMember.user;
        if (this.isIgnoredUser(filteredUser)) {
            filteredUser = partiedMembers.find(user => !this.isIgnoredUser(user));

            if (!filteredUser) {
                filteredUser = priorityMember.user;
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
    filterIgnoredGuilds(party) {
        var { voiceChannels } = party;
        if (voiceChannels.length === 0) {
            return false;
        }
        return voiceChannels.some(voiceChannel => this.isIgnoredGuild(voiceChannel.guild.id));
    },

});


