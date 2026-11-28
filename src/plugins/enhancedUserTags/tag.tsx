/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common";
import { Guild } from "discord-types/general";

import { tagIcons } from "./components/Icons";
import { OriginalMessageSystemTag, OriginalUsernameSystemTag } from "./components/OriginalSystemTag";
import settings from "./settings";
import { Channel, User } from "./types";
import { computePermissions, MODERATOR_PERMISSIONS_BITS, PERMISSIONS_BITS } from "./util/permissions";

export enum TAGS {
    THREAD_CREATOR = 1,
    POST_CREATOR,
    MODERATOR,
    ADMINISTRATOR,
    GROUP_OWNER, // DM group
    GUILD_OWNER,

    BOT,
    WEBHOOK,
    CLYDE,
    AUTOMOD,
    OFFICIAL,
}

export const TAG_NAMES = {
    [TAGS.THREAD_CREATOR]: "Thread Creator",
    [TAGS.POST_CREATOR]: "Post Creator",
    [TAGS.MODERATOR]: "Moderator",
    [TAGS.ADMINISTRATOR]: "Administrator",
    [TAGS.GROUP_OWNER]: "Group Owner",
    [TAGS.GUILD_OWNER]: "Server Owner",

    [TAGS.BOT]: "Bot",
    [TAGS.WEBHOOK]: "Webhook",
    [TAGS.CLYDE]: "Clyde",
    [TAGS.AUTOMOD]: "Official AutoMod Message",
    [TAGS.OFFICIAL]: "Official Discord",
};

// i18n.MODERATE_MEMBERS and i18n.MANAGE_GUILD is "" so I decided to define them all manually
// Array instead dict to have strict order
const MODERATOR_PERMISSIONS_NAMES: [bigint, string][] = [
    [PERMISSIONS_BITS.MANAGE_GUILD, "Manage Guild"],
    [PERMISSIONS_BITS.MANAGE_CHANNELS, "Manage Channels"],
    [PERMISSIONS_BITS.MANAGE_ROLES, "Manage Roles"],
    [PERMISSIONS_BITS.MANAGE_MESSAGES, "Manage Messages"],
    [PERMISSIONS_BITS.BAN_MEMBERS, "Ban Members"],
    [PERMISSIONS_BITS.KICK_MEMBERS, "Kick Members"],
    [PERMISSIONS_BITS.MODERATE_MEMBERS, "Timeout Members"],
];

const permissions2Text = (permissions: bigint): string => {
    return MODERATOR_PERMISSIONS_NAMES.filter(([bit]) => permissions & bit)
        .map(([, name], i, array) =>
            i === array.length - 1 ? name : `${name}, ${i % 2 === 0 ? "\n" : ""}`
        )
        .join("");
};

export interface TagDetails {
    icon: React.ComponentType;
    text?: string | null;
    gap?: boolean | null;
    halfGold?: boolean | null;
}

export type GetTagDetailsReturn = TagDetails | undefined | null;

const getTagDeailtsForPostOrThread = ({
    tag,
    perms,
    isBot,
    isGuildOwner,
    isAdministrator,
    isModerator,
}: {
    tag: TAGS.POST_CREATOR | TAGS.THREAD_CREATOR,
    perms: bigint;
    isBot: boolean;
    isGuildOwner: boolean;
    isAdministrator: boolean;
    isModerator: boolean;
}): GetTagDetailsReturn => {
    if (isBot) {
        if (isAdministrator)
            return {
                icon: tagIcons[TAGS.BOT],
                text: `${TAG_NAMES[tag]} | ${TAG_NAMES[TAGS.BOT]} (${TAG_NAMES[TAGS.ADMINISTRATOR]})`,
                halfGold: true,
            };

        if (isModerator)
            return {
                icon: tagIcons[TAGS.BOT],
                text: `${TAG_NAMES[tag]} | ${TAG_NAMES[TAGS.BOT]} (${permissions2Text(perms)})`,
                halfGold: true,
            };

        return {
            icon: tagIcons[TAGS.BOT],
            text: `${TAG_NAMES[tag]} | ${TAG_NAMES[TAGS.BOT]}`,
            halfGold: true,
        };
    }

    if (isGuildOwner)
        return {
            icon: tagIcons[tag],
            text: `${TAG_NAMES[tag]} | ${TAG_NAMES[TAGS.GUILD_OWNER]}`,
        };

    if (isAdministrator)
        return {
            icon: tagIcons[TAGS.ADMINISTRATOR],
            text: `${TAG_NAMES[tag]} | ${TAG_NAMES[TAGS.ADMINISTRATOR]}`,
            halfGold: true,
        };

    if (isModerator)
        return {
            icon: tagIcons[TAGS.MODERATOR],
            text: `${TAG_NAMES[tag]} | ${TAG_NAMES[TAGS.MODERATOR]} (${permissions2Text(perms)})`,
            halfGold: true,
        };

    return {
        icon: tagIcons[tag],
        text: TAG_NAMES[tag],
    };
};

export const getTagDetails = ({
    user,
    channel,
    guild,
}: {
    user?: User | null;
    channel?: Channel | null;
    guild?: Guild | null;
}): GetTagDetailsReturn => {
    if (!user) return;

    if (user.id === UserStore.getCurrentUser().id && settings.store.ignoreYourself)
        return;

    if (user.bot) {
        if (user.isSystemUser()) {
            if (settings.store.originalOfficialTag) {
                return {
                    icon: channel ? OriginalMessageSystemTag : OriginalUsernameSystemTag,
                };
            }

            return {
                icon: tagIcons[TAGS.OFFICIAL],
                text: `${TAG_NAMES[TAGS.OFFICIAL]} ${(channel?.isDM() || guild) ? "Message" : "Account"}`,
                gap: true,
            };
        }

        if (user.isClyde())
            return {
                icon: tagIcons[TAGS.CLYDE],
                text: TAG_NAMES[TAGS.CLYDE],
            };

        if (user.isNonUserBot())
            return {
                icon: tagIcons[TAGS.WEBHOOK],
                text: TAG_NAMES[TAGS.WEBHOOK],
            };

        if (!guild || channel?.isDM() || channel?.isGroupDM())
            return {
                icon: tagIcons[TAGS.BOT],
                text: TAG_NAMES[TAGS.BOT],
            };
    } else {
        if (channel?.isGroupDM())
            return channel.ownerId === user.id ? {
                icon: tagIcons[TAGS.GROUP_OWNER],
                text: TAG_NAMES[TAGS.GROUP_OWNER],
            } : null;

        if (channel?.isDM()) return;

        if (!guild) return;
    }

    const perms = computePermissions({
        user: user,
        context: guild,
        overwrites: channel ? channel.permissionOverwrites : null,
    });

    const isGuildOwner = guild.ownerId === user.id;

    const isAdministrator = !!(perms & PERMISSIONS_BITS.ADMINISTRATOR);

    const isModerator = !!(perms & MODERATOR_PERMISSIONS_BITS);

    // I'm 99% sure that only forumPost/thread can have `ownerId` (+ groupDM, but the check for that is above)
    // so for 100% I made this shit code :)
    // correct me please if my 99% is actually 100%
    if (channel && channel.ownerId === user.id) {
        if (channel.isForumPost())
            return getTagDeailtsForPostOrThread({
                tag: TAGS.POST_CREATOR,
                perms,
                isBot: user.bot,
                isGuildOwner,
                isAdministrator,
                isModerator,
            });

        if (channel.isThread())
            return getTagDeailtsForPostOrThread({
                tag: TAGS.THREAD_CREATOR,
                perms,
                isBot: user.bot,
                isGuildOwner,
                isAdministrator,
                isModerator,
            });
    }

    if (isGuildOwner)
        return {
            icon: tagIcons[TAGS.GUILD_OWNER],
            text: TAG_NAMES[TAGS.GUILD_OWNER],
        };

    if (isAdministrator) {
        if (user.bot)
            return {
                icon: tagIcons[TAGS.BOT],
                text: `${TAG_NAMES[TAGS.BOT]} (${TAG_NAMES[TAGS.ADMINISTRATOR]})`,
            };
        else
            return {
                icon: tagIcons[TAGS.ADMINISTRATOR],
                text: TAG_NAMES[TAGS.ADMINISTRATOR],
            };
    }

    if (isModerator) {
        if (user.bot)
            return {
                icon: tagIcons[TAGS.BOT],
                text: `${TAG_NAMES[TAGS.BOT]} (${permissions2Text(perms)})`,
            };
        else
            return {
                icon: tagIcons[TAGS.MODERATOR],
                text: `${TAG_NAMES[TAGS.MODERATOR]} (${permissions2Text(perms)})`,
            };
    }
};
