/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { insertTextIntoChatInputBox } from "@utils/discord";
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
    guildSettings?: Map<string, MemberGuildSettings>;
    systemSettings?: Map<string, SystemGuildSettings>;
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
    ReactionManager.addReaction(
        msg.channel_id,
        msg.id,
        {
            id: undefined,
            name: "❌",
            animated: false
        }
    );
}

export function generateAuthorData(message: Message) {
    return `${message.author.username}##${message.author.avatar}`;
}

export function getAuthorOfMessage(message: Message, pk: PKAPI) {
    if (authors[generateAuthorData(message)]) {
        authors[generateAuthorData(message)].messageIds.push(message.id);
        return authors[generateAuthorData(message)];
    }

    pk.getMessage({ message: message.id }).then(msg => {
        if (!(msg.member instanceof Member)) {
            pk.getMember({ member: msg.member??"n/a" }).then(m => {
                authors[generateAuthorData(message)] = ({ messageIds: [msg.id], member: m, system: msg.system as System });
                authors[generateAuthorData(message)].member.getGuildSettings(ChannelStore.getChannel(msg.channel).guild_id).then(guildSettings => {
                    authors[generateAuthorData(message)].guildSettings?.set(ChannelStore.getChannel(msg.channel).guild_id, guildSettings);
                });
            });
            if (msg.system instanceof System) {
                msg.system.getGuildSettings(ChannelStore.getChannel(msg.channel).guild_id).then(guildSettings => {
                    authors[generateAuthorData(message)].systemSettings?.set(ChannelStore.getChannel(msg.channel).guild_id, guildSettings);
                });
            }
        }
        const mem = msg.member as Member;
        // @ts-ignore
        authors[generateAuthorData(message)] = ({ messageIds: [msg.id], member: mem, system: msg.system as System });
    });

    DataStore.set(DATASTORE_KEY, authors);
    return authors[generateAuthorData(message)];
}
