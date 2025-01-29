/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { ChannelStore, GuildStore, PermissionsBits } from "@webpack/common";
import { Channel, Message, User } from "discord-types/general";

import { computePermissions, isWebhook, Tag, tags } from "./consts";
import { settings } from "./settings";

const genTagTypes = () => {
    let i = 100;
    const obj = {};

    for (const { name } of tags) {
        obj[name] = ++i;
        obj[i] = name;
        obj[`${name}-BOT`] = ++i;
        obj[i] = `${name}-BOT`;
        obj[`${name}-OP`] = ++i;
        obj[i] = `${name}-OP`;
    }

    return obj;
};

export default definePlugin({
    name: "MoreUserTags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.)",
    authors: [Devs.Cyn, Devs.TheSun, Devs.RyanCaoDev, Devs.LordElias, Devs.AutumnVN, Devs.hen],
    settings,
    patches: [
        // Render Tags in messages
        // Maybe there is a better way to catch this horror
        {
            find: ".isVerifiedBot(),hideIcon:",
            replacement: {
                match: /(?<=let (\i).{1,500}.isSystemDM.{0,350}),null==(\i\))(?=.{1,30}?null:)/,
                replace:
                    ",($1=$self.getTag({...arguments[0],isChat:true,origType:$1}))$&",
            },
        },
        // Make discord actually use our tags
        {
            find: ".STAFF_ONLY_DM:",
            replacement: {
                match: /(?<=type:(\i).{10,1000}.REMIX.{10,100})default:(\i)=/,
                replace: "default:$2=$self.getTagText($self.localTags[$1]);",
            },
        },
        // Member list
        // In the current state it makes smth like
        // null != U && U && ($1=blahblahblah)
        {
            find: ".lostPermission)",
            replacement: {
                match: /(?<=return .{0,20})\.bot?(?=.{0,100}type:(\i))/,
                replace: "&& ($1=$self.getTag({...arguments[0],isChat:false,origType:$1}))"
            }
        },

        // Next both 2 patches are goint together
        // First one passes down the react dom channelId which is required to get tag
        // Second one actually gets/displays it
        {
            find: ".hasAvatarForGuild(null==",
            replacement: {
                match: /user:\i,(?=.{0,50}.BITE_SIZE)/,
                replace: "$&channelId:arguments[0].channelId,"
            },
        },
        {
            find: ".clickableUsername",
            replacement: {
                match: /null!=(\i)(?=.{0,100}type:\i)/,
                replace: "($1=$self.getTag({...arguments[0],isChat:false,origType:$1}),$1!==null)"
            }
        }
    ],
    localTags: genTagTypes(),

    getTagText(passedTagName: string) {
        if (!passedTagName) return getIntlMessage("APP_TAG");
        const [tagName, variant] = passedTagName.split("-");

        const tag = tags.find(({ name }) => tagName === name);
        if (!tag) return getIntlMessage("APP_TAG");

        if (variant === "BOT" && tagName !== "WEBHOOK" && this.settings.store.dontShowForBots) return getIntlMessage("APP_TAG");

        const tagText = settings.store.tagSettings?.[tag.name]?.text || tag.displayName;
        switch (variant) {
            case "OP":
                return `${getIntlMessage("BOT_TAG_FORUM_ORIGINAL_POSTER")} • ${tagText}`;
            case "BOT":
                return `${getIntlMessage("APP_TAG")} • ${tagText}`;
            default:
                return tagText;
        }
    },

    getTag({
        message, user, channelId, origType, isChat, channel, ...rest
    }: {
        message?: Message,
        user: User & { isClyde(): boolean; },
        channel?: Channel & { isForumPost(): boolean; isMediaPost(): boolean; },
        channelId?: string;
        origType?: number;
        isChat?: boolean;
    }): number | null {
        if (!user)
            return null;
        if (isChat && user.id === "1")
            return Tag.Types.OFFICIAL;
        if (user.isClyde())
            return Tag.Types.AI;

        let type = typeof origType === "number" ? origType : null;

        channel ??= ChannelStore.getChannel(channelId!) as any;
        if (!channel) return type;

        const settings = this.settings.store;
        const perms = this.getPermissions(user, channel);

        for (const tag of tags) {
            if (isChat && !settings.tagSettings[tag.name].showInChat)
                continue;
            if (!isChat && !settings.tagSettings[tag.name].showInNotChat)
                continue;

            // If the owner tag is disabled, and the user is the owner of the guild,
            // avoid adding other tags because the owner will always match the condition for them
            if (
                (tag.name !== "OWNER" &&
                    GuildStore.getGuild(channel?.guild_id)?.ownerId ===
                    user.id &&
                    isChat &&
                    !settings.tagSettings.OWNER.showInChat) ||
                (!isChat &&
                    !settings.tagSettings.OWNER.showInNotChat)
            )
                continue;

            if ("permissions" in tag ?
                tag.permissions.some(perm => perms.includes(perm)) :
                tag.condition(message!, user, channel)) {
                if ((channel.isForumPost() || channel.isMediaPost()) && channel.ownerId === user.id)
                    type = this.localTags[`${tag.name}-OP`];

                else if (
                    user.bot &&
                    !isWebhook(message!, user) &&
                    !settings.dontShowBotTag
                )
                    type = this.localTags[`${tag.name}-BOT`];

                else type = this.localTags[tag.name];
                break;
            }
        }

        return type;
    },
    getPermissions(user: User, channel: Channel): string[] {
        const guild = GuildStore.getGuild(channel?.guild_id);
        if (!guild) return [];

        const permissions = computePermissions({ user, context: guild, overwrites: channel.permissionOverwrites });
        return Object.entries(PermissionsBits)
            .map(([perm, permInt]) =>
                permissions & permInt ? perm : ""
            )
            .filter(Boolean);
    },
});

