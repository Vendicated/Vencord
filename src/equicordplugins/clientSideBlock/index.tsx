/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { GuildMember } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore, GuildRoleStore, RelationshipStore, Text, UserStore } from "@webpack/common";

const settings = definePluginSettings(
    {
        usersToBlock: {
            type: OptionType.STRING,
            description: "User IDs seperated by a comma and a space",
            restartNeeded: true,
            default: ""
        },
        hideBlockedUsers: {
            type: OptionType.BOOLEAN,
            description: "Should blocked users should also be hidden everywhere",
            default: true,
            restartNeeded: true
        },
        hideBlockedMessages: {
            type: OptionType.BOOLEAN,
            description: "Should messages from blocked users should be hidden fully (same as the old noblockedmessages plugin)",
            default: true,
            restartNeeded: true
        },
        hideEmptyRoles: {
            type: OptionType.BOOLEAN,
            description: "Should role headers be hidden if all of their members are blocked",
            restartNeeded: true,
            default: true
        },
        blockedReplyDisplay: {
            type: OptionType.SELECT,
            description: "What should display instead of the message when someone replies to someone you have hidden",
            restartNeeded: true,
            options: [{ value: "displayText", label: "Display text saying a hidden message was replied to", default: true }, { value: "hideReply", label: "Literally nothing" }]
        },
        guildBlackList: {
            type: OptionType.STRING,
            description: "Guild ids to disable functionality in",
            restartNeeded: true,
            default: ""
        },
        guildWhiteList: {
            type: OptionType.STRING,
            description: "Guild ids to enable functionality in",
            restartNeeded: true,
            default: ""
        }
    });

function isChannelBlocked(channelID) {
    const guildID = ChannelStore.getChannel(channelID)?.guild_id;

    if (settings.store.guildBlackList.split(", ").includes(guildID) || (!settings.store.guildWhiteList.split(", ").includes(guildID) && settings.store.guildWhiteList.length > 0)) {
        return true;
    }

    return false;
}

function shouldHideUser(userId: string, channelId?: string) {
    if (channelId) {
        if (isChannelBlocked(channelId)) {
            return false;
        }

        const guildID = ChannelStore.getChannel(channelId)?.guild_id;

        // add new user hiding logic here at some point
    }

    // hide the user if the user is blocked and the hide blocked users setting is enabled
    if (RelationshipStore.isBlocked(userId) && settings.store.hideBlockedUsers) {
        return true;
    }
    // failsafe that is needed for some reason
    if (settings.store.usersToBlock.length === 0) {
        return false;
    }
    // hide the user if the id is in the users to block setting
    return settings.store.usersToBlock.split(", ").includes(userId);
}

// This is really horror
function isRoleAllBlockedMembers(roleId, guildId) {
    const role = GuildRoleStore.getRole(guildId, roleId);
    if (!role) return false;

    const membersWithRole: GuildMember[] = GuildMemberStore.getMembers(guildId).filter(member => member.roles.includes(roleId));
    if (membersWithRole.length === 0) return false;

    if (isChannelBlocked(guildId)) {
        return false;
    }
    // need to add an online check at some point but this sorta works for now
    return membersWithRole.every(member => shouldHideUser(member.userId) && !(UserStore.getUser(member.userId).desktop || UserStore.getUser(member.userId).mobile));
}


function hiddenReplyComponent() {
    switch (settings.store.blockedReplyDisplay) {
        case "displayText":
            return <Text tag="p" selectable={false} variant="text-sm/normal" style={{ marginTop: "0px", marginBottom: "0px" }}><i>↓ Replying to blocked message</i></Text>;
        case "hideReply":
            return null;
    }
}

export default definePlugin({
    name: "ClientSideBlock",
    description: "Allows you to locally hide almost all content from any user",
    tags: ["blocked", "block", "hide", "hidden", "noblockedmessages"],
    authors: [Devs.Samwich],
    settings,
    shouldHideUser: shouldHideUser,
    hiddenReplyComponent: hiddenReplyComponent,
    isRoleAllBlockedMembers: isRoleAllBlockedMembers,
    patches: [
        // message
        {
            find: ".messageListItem",
            replacement: {
                match: /renderContentOnly:\i}=\i;/,
                replace: "$&if($self.shouldHideUser(arguments[0].message.author.id, arguments[0].message.channel_id)) return null; "
            }
        },
        // friends list (should work with all tabs)
        {
            find: "peopleListItemRef.current.componentWillLeave",
            replacement: {
                match: /\i}=this.state;/,
                replace: "$&if($self.shouldHideUser(this.props.user.id)) return null; "
            }
        },
        // member list
        {
            find: "._areActivitiesExperimentallyHidden=(",
            replacement: {
                match: /(?<=user:(\i),guildId:\i,channel:(\i).*?)BOOST_GEM_ICON.{0,10}\);/,
                replace: "$&if($self.shouldHideUser($1.id, $2.id)) return null; "
            }
        },
        // stop the role header from displaying if all users with that role are hidden (wip sorta)
        {
            find: "._areActivitiesExperimentallyHidden=(",
            replacement: {
                match: /\i.memo\(function\(\i\){/,
                replace: "$&if($self.isRoleAllBlockedMembers(arguments[0].id, arguments[0].guildId)) return null;"
            },
            predicate: () => settings.store.hideEmptyRoles
        },
        // "1 blocked message"
        {
            find: "#{intl::BLOCKED_MESSAGE_COUNT}}",
            replacement: {
                match: /1:\i\.content.length;/,
                replace: "$&return null;"
            },
            predicate: () => settings.store.hideBlockedMessages
        },
        // replies
        {
            find: ".GUILD_APPLICATION_PREMIUM_SUBSCRIPTION||",
            replacement: [
                {
                    match: /let \i,\{repliedAuthor:/,
                    replace: "if(arguments[0] != null && arguments[0].referencedMessage.message != null) { if($self.shouldHideUser(arguments[0].referencedMessage.message.author.id, arguments[0].baseMessage.messageReference.channel_id)) { return $self.hiddenReplyComponent(); } }$&"
                }
            ]
        },
        // dm list
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                // horror but it works
                match: /(function\(\i,(\i),\i\){.*)(return \i\.isMultiUserDM\(\))/,
                replace: "$1if($2.rawRecipients[0] != null){if($2.rawRecipients[0].id != null){if($self.shouldHideUser($2.rawRecipients[0].id)) return null;}}$3"
            }
        },

        // thank nick (644298972420374528) for these patches :3

        // filter relationships
        {
            find: "getFriendIDs(){",
            replacement: {
                match: /return \i\.friends/,
                replace: "$&.filter(id => !$self.shouldHideUser(id))"
            }
        },
        // active now list
        {
            find: "ACTIVE_NOW_COLUMN)",
            replacement: {
                match: /(\i\.\i),\{\}\)\]/,
                replace: '"div",{children:$self.activeNowView($1())})]'
            }
        },
        // mutual friends list in user profile
        {
            find: "}getMutualFriends(",
            replacement: {
                match: /(getMutualFriends\(\i\){)return (\i\.get\(\i\))/,
                replace: "$1if($2 != undefined) return $2.filter(u => !$self.shouldHideUser(u.key))"
            }
        }
    ],
    activeNowView(cards) {
        if (!Array.isArray(cards)) return cards;

        return cards.filter(card => {
            if (!card?.key) return false;
            const newKey = card.key.match(/(?:user-|party-spotify:)(.+)/)?.[1];
            return this.shouldHideUser(newKey) ? null : card;
        });
    }
});
