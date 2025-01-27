/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { StartAt } from "@utils/types";
import { ChannelStore, GuildStore, PermissionsBits } from "@webpack/common";
import { Channel, Message, User } from "discord-types/general";

import { computePermissions, isWebhook, Tag, tags } from "./consts";
import { settings } from "./settings";


export default definePlugin({
    name: "MoreUserTags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.)",
    authors: [Devs.Cyn, Devs.TheSun, Devs.RyanCaoDev, Devs.LordElias, Devs.AutumnVN, Devs.hen],
    settings,
    patches: [
        // Render Tags in messages
        // Maybe there is a better way to catch this horror
        {
            find: ".Types.ORIGINAL_POSTER",
            replacement: {
                match: /(?<=let (\i).{1,200}children:\i}=\i;.{0,100}.isSystemDM.{0,350}),null==\i\)(?=.{1,30}?null:)/,
                replace: ',($1=$self.getTag({...arguments[0],location:"chat",origType:$1}))$&'
            }
        },
        // Make discord actually use our tags
        {
            find: ".STAFF_ONLY_DM:",
            replacement: {
                match: /(?<=type:(\i).{10,1000}.REMIX.{10,100})default:(\i)=/,
                replace: "default:$2=$self.getTagText($self.tagObj[$1]);"
            }
        }
    ],
    tagObj: {},
    startAt: StartAt.Init,
    start() {
        this.genTagTypes();
    },

    genTagTypes() {
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

        this.tagObj = obj;
    },

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
        message, user, channelId, origType, location, channel
    }: {
        message?: Message,
        user: User & { isClyde(): boolean; },
        channel?: Channel & { isForumPost(): boolean; isMediaPost(): boolean; },
        channelId?: string;
        origType?: number;
        location: "chat" | "not-chat";
    }): number | null {
        if (!user)
            return null;
        if (location === "chat" && user.id === "1")
            return Tag.Types.OFFICIAL;
        if (user.isClyde())
            return Tag.Types.AI;

        let type = typeof origType === "number" ? origType : null;

        channel ??= ChannelStore.getChannel(channelId!) as any;
        if (!channel) return type;

        const settings = this.settings.store;
        const perms = this.getPermissions(user, channel);

        for (const tag of tags) {
            if (location === "chat" && !settings.tagSettings[tag.name].showInChat) continue;
            if (location === "not-chat" && !settings.tagSettings[tag.name].showInNotChat) continue;

            // If the owner tag is disabled, and the user is the owner of the guild,
            // avoid adding other tags because the owner will always match the condition for them
            if (
                tag.name !== "OWNER" &&
                GuildStore.getGuild(channel?.guild_id)?.ownerId === user.id &&
                (location === "chat" && !settings.tagSettings.OWNER.showInChat) ||
                (location === "not-chat" && !settings.tagSettings.OWNER.showInNotChat)
            ) continue;

            if (
                tag.permissions?.some(perm => perms.includes(perm)) ||
                (tag.condition?.(message!, user, channel))
            ) {
                console.log("TAGS HELP", tag, this.tagObj);
                if ((channel.isForumPost() || channel.isMediaPost()) && channel.ownerId === user.id)
                    type = this.tagObj[`${tag.name}-OP`];
                else if (user.bot && !isWebhook(message!, user) && !settings.dontShowBotTag)
                    type = this.tagObj[`${tag.name}-BOT`];
                else
                    type = this.tagObj[tag.name];
                break;
            }
        }
        console.log("TAGS", type);
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

