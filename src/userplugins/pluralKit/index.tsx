/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { DataStore } from "@api/index";
import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { DeleteIcon } from "@components/Icons";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher } from "@webpack/common";
import { Message } from "discord-types/general";
import { Member, MemberGuildSettings, PKAPI, System, SystemGuildSettings } from "pkapi.js";

import pluralKit from "./index";

function isPk(msg: Message) {
    return (msg && msg.applicationId === "466378653216014359");
}

const EditIcon = () => {
    return <svg role={"img"} width={"16"} height={"16"} fill={"none"} viewBox={"0 0 24 24"}>
        <path fill={"currentColor"} d={"m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z"}></path>
    </svg>;
};

const settings = definePluginSettings({
    colorNames: {
        type: OptionType.BOOLEAN,
        description: "Display member colors in their names in chat",
        default: false
    },
    displayMemberId: {
        type: OptionType.BOOLEAN,
        description: "Display member IDs in chat",
        default: false
    },
    displayMemberPronouns: {
        type: OptionType.BOOLEAN,
        description: "Display member pronouns in chat",
        default: false
    }
});

// I dont fully understand how to use datastores, if I used anything incorrectly please let me know
const DATASTORE_KEY = "pk";

interface Author {
    messageIds: string[];
    member: Member;
    system: System;
    guildSettings?: Map<string, MemberGuildSettings>;
    systemSettings?: Map<string, SystemGuildSettings>;
}

let authors: Record<string, Author> = {};

const ReactionManager = findByPropsLazy("addReaction", "getReactors");

export default definePlugin({
    name: "Plural Kit",
    description: "Pluralkit integration for Vencord",
    authors: [{
        name: "Scyye",
        id: 553652308295155723n
    }],
    startAt: StartAt.WebpackReady,
    settings,
    patches: [
        {
            find: '?"@":"")',
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\)}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
    ],

    renderUsername: ({ author, message, isRepliedMessage, withMentionPrefix }) => {
        const prefix = isRepliedMessage && withMentionPrefix ? "@" : "";
        try {
            const discordUsername = author.nick??author.displayName??author.username;
            if (!isPk(message))
                return <>{prefix}{discordUsername}</>;

            const authorOfMessage = getAuthorOfMessage(message);
            let color: string = "666666";

            if (authorOfMessage?.member && settings.store.colorNames) {
                color = authorOfMessage.member.color??color;
            }
            const member: Member = authorOfMessage?.member as Member;
            const memberSettings = authorOfMessage?.guildSettings?.get(ChannelStore.getChannel(message.channel_id).guild_id);
            const systemSettings = authorOfMessage?.systemSettings?.get(ChannelStore.getChannel(message.channel_id).guild_id);

            const name = memberSettings?.display_name??member.display_name??member.name;
            const pronouns = settings.store.displayMemberPronouns&&member.pronouns?` | (${authorOfMessage.member.pronouns})`:undefined;
            const tag = systemSettings? systemSettings.tag?systemSettings.tag:authorOfMessage.system.tag??undefined:undefined;
            const id = settings.store.displayMemberId?` (${member.id})`:undefined;


            return <span style={{
                color: `#${color}`,
            }}>{prefix}{name}{pronouns}{tag}{id}</span>;
        } catch {
            return <>{prefix}{author?.nick}</>;
        }
    },

    api: new PKAPI({
    }),

    async start() {
        authors = await DataStore.get<Record<string, Author>>(DATASTORE_KEY) || {};

        addButton("pk-edit", msg => {
            if (!msg) return null;
            if (!isPk(msg)) return null;

            return {
                label: "Edit",
                icon: () => {
                    return <EditIcon/>;
                },
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => replyToMessage(msg, false, true, "pk;edit " + msg.content),
                onContextMenu: _ => {}
            };
        });

        addButton("pk-delete", msg => {
            if (!msg) return null;
            if (!isPk(msg)) return null;

            return {
                label: "Delete",
                icon: () => {
                    return <DeleteIcon/>;
                },
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => deleteMessage(msg),
                onContextMenu: _ => {}
            };
        });
    },
    stop() {
        removeButton("pk-edit");
    },
});

function replyToMessage(msg: Message, mention: boolean, hideMention: boolean, content?: string | undefined) {
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

function deleteMessage(msg: Message) {
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

function generateAuthorData(message: Message) {
    return `${message.author.username}##${message.author.avatar}`;
}

function getAuthorOfMessage(message: Message) {
    if (authors[generateAuthorData(message)]) {
        authors[generateAuthorData(message)].messageIds.push(message.id);
        return authors[generateAuthorData(message)];
    }

    pluralKit.api.getMessage({ message: message.id }).then(msg => {
        if (!(msg.member instanceof Member)) {
            pluralKit.api.getMember({ member: msg.member??"n/a" }).then(m => {
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
