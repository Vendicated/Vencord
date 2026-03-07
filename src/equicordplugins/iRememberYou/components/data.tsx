/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Guild, User } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore, GuildStore, InviteActions, MessageStore, PermissionsBits, PermissionStore, UserStore, } from "@webpack/common";

export interface IUserExtra {
    isOwner?: boolean;
    updatedAt?: number;
}

export interface IStorageUser {
    id: string;
    username: string,
    tag: string,
    iconURL?: string;
    extra?: IUserExtra;
}

export interface GroupData {
    id: string;
    users: { [key: string]: IStorageUser; };
    name: string;
    inviteLink?: string;
}

export class Data {
    declare usersCollection: Record<string, GroupData>;
    declare _storageAutoSaveProtocol_interval;
    declare _onMessagePreSend_preSend;

    withStart() {
        return this;
    }

    onMessagePreSend(channelId, message, extra) {
        const target: Set<{ user: User; source?: Guild, extra: IUserExtra; }> = new Set();
        const now = Date.now();
        const { replyOptions } = extra;

        const guild = (() => {
            const channel = ChannelStore.getChannel(channelId);
            return GuildStore.getGuild(channel.guild_id) || undefined;
        })();

        if (replyOptions.messageReference) {
            const { channel_id, message_id } = replyOptions.messageReference;
            const message = MessageStore.getMessage(channel_id, message_id);
            if (!message) {
                return;
            }
            const { author } = message;

            target.add({ user: author, source: guild, extra: { updatedAt: now } });
        }

        if (message.content) {
            const { content } = message;
            const ids = [...content.matchAll(/<@!?(?<id>\d{17,23})>/g)].map(
                ({ groups }) => groups.id
            );

            const users = ids
                .map(id => UserStore.getUser(id))
                .filter(Boolean);
            for (const user of users) {
                target.add({ user, source: guild, extra: { updatedAt: now } });
            }
        }

        this.processUsersToCollection([...target]);
    }

    async processUsersToCollection(
        array: { user: User; source?: Guild; extra?: IUserExtra; }[]
    ) {
        const target = this.usersCollection;
        const processedGuilds = new Set<string>();

        for (const { user, source, extra } of array) {
            if (user.bot) {
                continue;
            }

            const groupKey = source?.id ?? "dm";
            const group = (target[groupKey] ||= {
                name: source?.name || "dm",
                id: source?.id || user.id,
                users: {},
                inviteLink: undefined
            });
            const usersField = group.users;
            const previouExtra = usersField[user.id]?.extra ?? {};
            const { id, username } = user;

            usersField[id] = {
                id,
                username,
                tag: user.discriminator === "0" ? user.username : user.tag,
                extra: { ...previouExtra, ...extra },
                iconURL: user.getAvatarURL(),
            };

            if (source && !processedGuilds.has(source.id) && this.hasInvitePermissions(source.id)) {
                this.collectInviteLink(source.id);
                processedGuilds.add(source.id);
            }
        }
    }

    async updateStorage() {
        await DataStore.set("irememberyou.data", this.usersCollection);
    }

    async initializeUsersCollection() {
        const data = await DataStore.get("irememberyou.data");
        this.usersCollection = data ?? {};
    }

    writeMembersFromUserGuildsToCollection() {
        const target: Set<{ user: User; source?: Guild, extra: IUserExtra; }> =
            new Set();

        const now = Date.now();
        const LIMIT = 1_000;

        const clientId = UserStore.getCurrentUser().id;
        if (!clientId) {
            return;
        }
        for (const guild of Object.values(GuildStore.getGuilds())) {
            const { ownerId } = guild;
            if (ownerId !== clientId) {
                continue;
            }

            const members = GuildMemberStore.getMembers(guild.id);
            if (members.length > LIMIT) {
                members.length = LIMIT;
            }
            for (const member of members) {
                const user = UserStore.getUser(member.userId);
                target.add({ user, source: guild, extra: { updatedAt: now } });
            }

            this.processUsersToCollection([...target]);

            if (guild && this.hasInvitePermissions(guild.id)) {
                this.collectInviteLink(guild.id);
            }
        }
    }

    writeGuildsOwnersToCollection() {
        const target: Set<{ user: User; source?: Guild; extra: IUserExtra; }> =
            new Set();
        const now = Date.now();

        for (const guild of Object.values(GuildStore.getGuilds())) {
            const { ownerId } = guild;
            const owner = UserStore.getUser(ownerId);
            if (!owner) {
                continue;
            }
            target.add({
                user: owner,
                source: guild,
                extra: { isOwner: true, updatedAt: now },
            });
        }

        this.processUsersToCollection([...target]);
    }

    hasInvitePermissions(guildId: string): boolean {
        const guild = GuildStore.getGuild(guildId);
        if (!guild) return false;

        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) return false;

        if (guild.ownerId === currentUser.id) return true;

        const member = GuildMemberStore.getMember(guildId, currentUser.id);
        if (!member) return false;

        return PermissionStore.can(PermissionsBits.CREATE_INSTANT_INVITE, guild);
    }

    async collectInviteLink(guildId: string) {
        try {
            const invites = await InviteActions.getInvites(guildId);
            if (invites && invites.length > 0) {
                const invite = invites[0];
                const inviteCode = invite.code;
                const inviteLink = `https://discord.gg/${inviteCode}`;

                if (this.usersCollection[guildId]) {
                    this.usersCollection[guildId].inviteLink = inviteLink;
                }
            }
        } catch (error) {
            console.warn("Failed to collect invite link for guild:", guildId, error);
        }
    }

    storageAutoSaveProtocol() {
        this._storageAutoSaveProtocol_interval = setInterval(
            this.updateStorage.bind(this),
            60_000 * 3
        );
    }
}
