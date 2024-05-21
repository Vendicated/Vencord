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

import { addButton, removeButton } from "@api/MessagePopover";
import ErrorBoundary from "@components/ErrorBoundary";
import { copyWithToast } from "@utils/misc";
import {
    closeModal,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalRoot,
    ModalSize,
    openModal
} from "@utils/modal";
import definePlugin, { StartAt } from "@utils/types";
import { Button, ChannelStore, FluxDispatcher, Forms, Text } from "@webpack/common";
import { Message, User } from "discord-types/general";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { EdgeIcon } from "../../plugins/betterSessions/components/icons";
import { Member, PKAPI, Switch } from "pkapi.js";
import { Badges } from "@api/index";
import { BadgeUserArgs } from "@api/Badges";
import { definePluginSettings } from "@api/Settings";

const api = new PKAPI({
});

function isPk(msg: Message) {
    // If the message is null, early return
    return (msg && msg.applicationId === "466378653216014359")
}

const settings = definePluginSettings({

});


export default definePlugin({
    name: "Plural Kit Edit",
    description: "Allows easier editing of pluralkit messages",
    authors: [{ id: 553652308295155723n, name: "Scyye" }],
    startAt: StartAt.WebpackReady,
    patches: [
        {
            find: ".useCanSeeRemixBadge)",
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\)}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
    ],

    renderUsername: ({ author, message, isRepliedMessage, withMentionPrefix, userOverride }) => {
        try {
            const user: User = userOverride ?? message.author;
            let { username } = user;
            username = (user as any).globalName || username;

            const { nick } = author;
            const prefix = withMentionPrefix ? "@" : "";
            return <>{message.id}</>
            return api.getMessage({message:message.id}).then((msg) => {
                if (msg === undefined) {
                    return <>{username}</>;
                }
                return <>{message.id}</>;
            });
            /*
            if ((username === nick || isRepliedMessage) && !isPk(message))
                return <>{prefix}{nick}</>;

            let fronters = await (await api.getSystem({ system: user.id })).getFronters();
            if (fronters === undefined) {
                return <>Error</>;
            }
            return <>{prefix}{username} ({(fronters as Switch).members})</>*/
        } catch {
            return <>{author?.nick}</>;
        }
    },

    async start() {
        addButton("pk-edit", msg => {
            if (!msg) return null;
            if (!isPk(msg)) return null;
            const handleClick = () => {
                replyToMessage(msg, false, true, "pk;edit " + msg.content);
            };

            return {
                label: "Edit PluralKit",
                icon: () => {
                    return <EdgeIcon/>;
                },
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: handleClick,
                onContextMenu: (e) => {}
            };
        });

        const system = await api.getSystem({ system: "318902553024659456"});

        if (system === undefined) {
            console.log("1")
            return;
        }
        // @ts-ignore
        (await system.getFronters()).members.forEach((member:Member) => {
            console.log(member)
            Badges.addBadge({
                key: "pk-badge-" + system.id + "-" + member.id,
                image: member.avatar_url??undefined,
                description: member.name,
                link: "https://discord.com/users/" + member.id,
                shouldShow(userInfo: BadgeUserArgs): boolean {
                    return userInfo.user.id === "318902553024659456";
                }
            });
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

function getMessageLink(msg: Message) {
    var guildId = ChannelStore.getChannel(msg.channel_id).getGuildId();

    return `https://discord.com/channels/${guildId}/${msg.channel_id}/${msg.id}`;
}
