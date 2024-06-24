/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { useAwaiter } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher } from "@webpack/common";
import { Message } from "discord-types/general";
import { Member, MemberGuildSettings, PKAPI, System, SystemGuildSettings } from "pkapi.js";

// I dont fully understand how to use datastores, if I used anything incorrectly please let me know
export const DATASTORE_KEY = "pk";
export let authors: Record<string, Author> = {};
const ReactionManager = findByPropsLazy("addReaction", "getReactors");

export interface Author {
    messageIds: string[];
    member: Member;
    system: System;
    guildSettings: Map<string, MemberGuildSettings>;
    systemSettings: Map<string, SystemGuildSettings>;
}

export function isPk(msg: Message) {
    return (msg && msg.applicationId === "466378653216014359");
}

export function isOwnPkMessage(message: Message, localSystemData: string): boolean {
    const localSystem: Author[] = JSON.parse(localSystemData);
    return localSystem.map(value => value.messageIds).map(value => value.includes(message.id)).includes(true);
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
    msg.addReaction(
        {
            id: undefined,
            name: "❌",
            animated: false
        },
        true
    );
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

