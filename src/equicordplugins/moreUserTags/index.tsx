/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getCurrentChannel, getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { Channel, Message, User } from "@vencord/discord-types";
import { ChannelStore, GuildStore, PermissionsBits, SelectedChannelStore, UserStore } from "@webpack/common";

import { computePermissions, Tag, tags } from "./consts";
import { settings } from "./settings";
import { TagSettings } from "./types";

const cl = classNameFactory("vc-mut-");

const genTagTypes = () => {
    let i = 100;
    const obj = {};

    for (const { name } of tags) {
        obj[name] = ++i;
        obj[i] = name;
    }

    return obj;
};

export default definePlugin({
    name: "MoreUserTags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.)",
    authors: [Devs.Cyn, Devs.TheSun, Devs.RyanCaoDev, Devs.LordElias, Devs.AutumnVN, EquicordDevs.Hen],
    settings,
    patches: [
        // Make discord actually use our tags
        {
            find: ".STAFF_ONLY_DM:",
            replacement: [
                {
                    match: /(?<=type:(\i).*?\.BOT:.{0,25})default:(\i)=/,
                    replace: "default:$2=$self.getTagText($self.localTags[$1]);",
                },
                {
                    match: /(?<=type:(\i).*?)\.BOT:(?=default:)/,
                    replace: "$&return null;",
                    predicate: () => settings.store.dontShowBotTag
                },
            ],
        }
    ],
    start() {
        const tagSettings = settings.store.tagSettings || {} as TagSettings;
        for (const tag of Object.values(tags)) {
            tagSettings[tag.name] ??= {
                showInChat: true,
                showInNotChat: true,
                text: tag.displayName
            };
        }

        settings.store.tagSettings = tagSettings;
    },
    localTags: genTagTypes(),
    getChannelId() {
        return SelectedChannelStore.getChannelId();
    },
    renderNicknameIcon(props) {
        const tagId = this.getTag({
            user: UserStore.getUser(props.userId),
            channel: getCurrentChannel(),
            channelId: this.getChannelId(),
            isChat: false
        });

        return tagId && <Tag
            type={tagId}
            verified={false}>
        </Tag>;

    },
    renderMessageDecoration(props) {
        const tagId = this.getTag({
            message: props.message,
            user: UserStore.getUser(props.message.author.id),
            channelId: props.message.channel_id,
            isChat: true
        });

        return tagId && <Tag
            useRemSizes={true}
            className={cl("message-tag", props.message.author.isVerifiedBot() && "message-verified")}
            type={tagId}
            verified={false}>
        </Tag>;
    },
    renderMemberListDecorator(props) {
        const tagId = this.getTag({
            user: props.user,
            channel: getCurrentChannel(),
            channelId: this.getChannelId(),
            isChat: false
        });

        return tagId && <Tag
            type={tagId}
            verified={false}>
        </Tag>;
    },

    getTagText(tagName: string) {
        if (!tagName) return getIntlMessage("APP_TAG");
        const tag = tags.find(({ name }) => tagName === name);
        if (!tag) return tagName || getIntlMessage("APP_TAG");

        return settings.store.tagSettings?.[tag.name]?.text || tag.displayName;
    },

    getTag({
        message, user, channelId, isChat, channel
    }: {
        message?: Message,
        user?: User,
        channel?: Channel & { isForumPost(): boolean; isMediaPost(): boolean; },
        channelId?: string;
        isChat?: boolean;
    }): number | null {
        const settings = this.settings.store;

        if (!user) return null;
        if (isChat && user.id === "1") return null;
        if (user.bot && settings.dontShowForBots) return null;

        channel ??= ChannelStore.getChannel(channelId!) as any;
        if (!channel) return null;

        const perms = this.getPermissions(user, channel);

        for (const tag of tags) {
            if (isChat && !settings.tagSettings[tag.name]?.showInChat)
                continue;
            if (!isChat && !settings.tagSettings[tag.name]?.showInNotChat)
                continue;

            // If the owner tag is disabled, and the user is the owner of the guild,
            // avoid adding other tags because the owner will always match the condition for them
            if (
                (tag.name !== "OWNER" &&
                    GuildStore.getGuild(channel?.guild_id)?.ownerId ===
                    user.id &&
                    isChat &&
                    !settings.tagSettings.OWNER.showInChat) ||
                (GuildStore.getGuild(channel?.guild_id)?.ownerId ===
                    user.id &&
                    !isChat &&
                    !settings.tagSettings.OWNER.showInNotChat)
            )
                continue;

            if ("permissions" in tag ?
                tag.permissions.some(perm => perms.includes(perm)) :
                tag.condition(message!, user, channel)) {

                return this.localTags[tag.name];
            }
        }

        return null;
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
