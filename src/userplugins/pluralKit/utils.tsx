/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { ChannelStore, FluxDispatcher, Toasts, React, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";
import { Member, MemberGuildSettings, PKAPI, System, SystemGuildSettings } from "pkapi.js";
import { findComponentByCodeLazy, LazyComponentWebpack } from "@webpack";
import { openModal } from "@utils/modal";
import pluralKit from "./index";

// I dont fully understand how to use datastores, if I used anything incorrectly please let me know
export const DATASTORE_KEY = "pk";
export const UserPopoutComponent = findComponentByCodeLazy("customStatusActivity:", "isApplicationStreaming:", "disableUserProfileLink:");
const VerifiedIconComponent = findComponentByCodeLazy(".CONNECTIONS_ROLE_OFFICIAL_ICON_TOOLTIP");

export let authors: Record<string, Author> = {};

export interface Author {
    messageIds: string[];
    member: Member;
    system: System;
    guildSettings: Map<string, MemberGuildSettings>;
    systemSettings: Map<string, SystemGuildSettings>;
}

interface MyUser {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    bot: boolean;
    bio: string
}

export function isPk(msg: Message) {
    return (msg && msg.applicationId === "466378653216014359");
}

export function isOwnPkMessage(message: Message, localSystemData: string): boolean {
    if (!isPk(message)) return false;
    const localSystem: Author[] = JSON.parse(localSystemData);
    return localSystem.map(author => author.member.id).some(id => id === getAuthorOfMessage(message, new PKAPI()).member.id);
}

export function ProfilePopout({msg}:{msg: Message}) {
    const author = getAuthorOfMessage(msg, new PKAPI());
    const user: User = {
        bot: false,
        id: author.member.id,
        avatar: author.member.avatar,
        username: author.member.name,
        globalName: author.member.name,
        discriminator: author.member.id,
        bio: author.member.description??"",
        verified: true,
        system: false,
        banner: author.member.banner??"",
        desktop: true,
        mobile: true,
        email: "",
        accentColor: 5,
        flags: 0,
        mfaEnabled: true,
        nsfwAllowed: true,
        phone: "",
        premiumType: 0,
        premiumUsageFlags: 0,
        publicFlags: 0,
        purchasedFlags: 0,
    }
    return (
        <UserPopoutComponent
            user={UserStore.getCurrentUser()}
        />
    )
}

export function replaceTags(content: string, message: Message, localSystemData: string) {
    const author = getAuthorOfMessage(message, new PKAPI());
    const localSystem: Author[] = JSON.parse(localSystemData);

    const systemSettings: SystemGuildSettings = author.systemSettings[ChannelStore.getChannel(message.channel_id).guild_id];
    const memberSettings: MemberGuildSettings = author.guildSettings[ChannelStore.getChannel(message.channel_id).guild_id]
    const system = author.system;

    // prioritize guild settings, then system/member settings
    const tag = systemSettings ? systemSettings.tag : system.tag;
    const name = memberSettings ? memberSettings.display_name : author.member.display_name??author.member.name;
    const avatar = memberSettings ? memberSettings.avatar_url : author.member.avatar;

    return content
        .replace(/{tag}/g, tag??"")
        .replace(/{name}/g, name??"")
        .replace(/{memberid}/g, author.member.id??"")
        .replace(/{pronouns}/g, author.member.pronouns??"")
        .replace(/{systemid}/g, author.system.id??"")
        .replace(/{systemname}/g, author.system.name??"")
        .replace(/{color}/g, author.member.color??"ffffff")
        .replace(/{avatar}/g, avatar??"")
        .replace(/{messagecount}/g, author.messageIds.length.toString()??"")
        .replace(/{systemmessagecount}/g, localSystem.map(author => author.messageIds.length).reduce((acc, val) => acc + val).toString());
}

export async function loadAuthors() {
    authors = await DataStore.get<Record<string, Author>>(DATASTORE_KEY) ?? {};
}

export function replyToMessage(msg: Message, mention: boolean, hideMention: boolean, content?: string | undefined) {
    FluxDispatcher.dispatch({
        type: "CREATE_PENDING_REPLY",
        channel: ChannelStore.getChannel(msg.channel_id),
        message: msg,
        shouldMention: mention,
        showMentionToggle: !hideMention,
    });
    if (content) {
        insertTextIntoChatInputBox(content);
    }
}

export function deleteMessage(msg: Message) {
    // todo: fix
    FluxDispatcher.dispatch({
        type: "MESSAGE_REACTION_ADD",
        message: msg,
        emoji: { name: "❌" },
    });
    Toasts.show({
        message: "This needs to be fixed, use :x: to delete messages for now.",
        id: Toasts.genId(),
        type: Toasts.Type.FAILURE,
        options: {
            duration: 3000
        }
    });
}

export function generateAuthorData(message: Message) {
    return `${message.author.username}##${message.author.avatar}`;
}

export function getAuthorOfMessage(message: Message, pk: PKAPI) {
    const authorData = generateAuthorData(message);
    let author: Author = authors[authorData]??undefined;

    if (author) {
        author.messageIds.push(message.id);
        authors[authorData] = author;
        DataStore.set(DATASTORE_KEY, authors);
        return author;
    }

    pk.getMessage({ message: message.id }).then(msg => {
        author = ({ messageIds: [msg.id], member: msg.member as Member, system: msg.system as System, systemSettings: new Map(), guildSettings: new Map() });
        author.member.getGuildSettings(ChannelStore.getChannel(msg.channel).guild_id).then(guildSettings => {
            author.guildSettings?.set(ChannelStore.getChannel(msg.channel).guild_id, guildSettings);
        });

        author.system.getGuildSettings(ChannelStore.getChannel(msg.channel).guild_id).then(guildSettings => {
            author.systemSettings?.set(ChannelStore.getChannel(msg.channel).guild_id, guildSettings);
        });

        authors[authorData] = author;
        DataStore.set(DATASTORE_KEY, authors);
    });

    return authors[authorData];
}

