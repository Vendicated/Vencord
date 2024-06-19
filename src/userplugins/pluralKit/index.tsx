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
import { classNameFactory } from "@api/Styles";
import { DeleteIcon, PlusIcon } from "@components/Icons";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { Margins } from "@utils/margins";
import {
    ModalCloseButton,
    ModalContent, ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal
} from "@utils/modal";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, Forms, PermissionStore, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";
import { Member, PKAPI, System } from "pkapi.js";

import pluralKit from "./index";
import { localStorage } from "@utils/localStorage";

function isPk(msg: Message) {
    return (msg && msg.applicationId === "466378653216014359");
}

const EditIcon = () => {
    return <svg role={"img"} width={"16"} height={"16"} fill={"none"} viewBox={"0 0 24 24"}>
        <path fill={"currentColor"} d={"m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z"}></path>
    </svg>;
};

const cl = classNameFactory("vc-pluralkit-");

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

// I dont fully understand how to use datastores, if i used anything incorrectly please let me know
const DATASTORE_KEY = "pk";

interface Author {
    messageIds: string[];
    member: Member;
    system: System;
}

let authors: Record<string, Author> = {};

let localSystem: Author[] = [];

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
            find: ".useCanSeeRemixBadge)",
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\)}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
    ],

    renderUsername: ({ author, message, isRepliedMessage, withMentionPrefix }) => useAwaiter(async () => {
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
            const systemSettings = await (authorOfMessage?.system as System).getGuildSettings(message.guild_id);

            return <span style={{
                color: `#${color}`,
            }}>{prefix}{member.display_name??member.name}{settings.store.displayMemberPronouns&&authorOfMessage.member.pronouns?` | (${authorOfMessage.member.pronouns})`:""}{systemSettings.tag??authorOfMessage.system?.tag??""}{settings.store.displayMemberId?` (${member.id})`:""}</span>;
        } catch {
            return <>{prefix}{author?.nick}</>;
        }
    }),

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

        addButton("pk-view-profile", msg => {
            if (!msg) return null;
            if (!isPk(msg)) return null;

            return {
                icon: () => {
                    return <PlusIcon/>;
                },
                label: "View Profile",
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => openProfile(msg)
            };

        });
    },
    stop() {
        removeButton("pk-edit");
    },
});

async function openProfile(message: Message) {
    const author = getAuthorOfMessage(message);
    const id = author.member?.id??"n/a";
    openModal(modalProps => {
        return <UserPopoutModal author={author} modalProps={modalProps}/>;
    });
}

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
    if (PermissionStore.can("MANAGE_MESSAGES", msg.channel_id)) {
        FluxDispatcher.dispatch({
            type: "MESSAGE_DELETE",
            channelId: msg.channel_id,
            message: msg.id
        });
    } else {
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
            });
        }
        const mem = msg.member as Member;
        // @ts-ignore
        authors[generateAuthorData(message)] = ({ messageIds: [msg.id], member: mem, system: msg.system as System });
    });

    DataStore.set(DATASTORE_KEY, authors);
    return authors[generateAuthorData(message)];
}
/*
async function generateLocalSystemData() {
    let author: Author|undefined = undefined;
    const system = await pluralKit.api.getSystem({ system: UserStore.getCurrentUser().id });
    for (const s of system.members??[]) {
        author = {
            messageIds: [],
            member: member,
            system: system
        };
        localSystem.push(author);
    }

}*/


function UserPopoutModal({ author, modalProps }: { author: Author, modalProps: ModalProps; }) {
    const { member, system } = author;

    if (!member || !system) {
        return UnknownUser(modalProps);
    }

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormSection>
                    <img className={cl("banner")} src={member.banner ?? system.banner ?? ""} alt={"Banner"} height={120}
                        width={340}/>
                </Forms.FormSection>
                <img className={cl("avatar")} src={member.avatar_url ?? system.avatar_url ?? ""} alt="Avatar"
                    height={128} width={128} style={
                        {
                            borderRadius: "50%",
                            border: "1px solid var(--background-modifier-accent)"
                        }
                    }/>
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Forms.FormTitle tag="h3">
                    {member.display_name}
                </Forms.FormTitle>
                <Forms.FormText>{member.name}</Forms.FormText>
            </ModalContent>
            <ModalFooter>
                <Forms.FormTitle tag="h3">
                    {system.name}
                </Forms.FormTitle>
                <Forms.FormText>{system.tag}</Forms.FormText>
            </ModalFooter>
        </ModalRoot>
    );
}


const UnknownUser = (modalProps: ModalProps) => {
    return (
        <ModalRoot {...modalProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    User not found
                </Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent className={cl("modal-content")}>
                <section className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">
                        The user you're trying to view doesn't exist.
                    </Forms.FormTitle>
                </section>
            </ModalContent>
        </ModalRoot>
    );
};
