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

import { addPreEditListener } from "@api/MessageEvents";
import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { DeleteIcon } from "@components/Icons";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import {
    Button,
    ChannelStore,
    MessageActions,
    MessageStore,
    UserStore
} from "@webpack/common";
import { Message, User } from "discord-types/general";
import { Member, PKAPI } from "pkapi.js";

import pluralKit from "./index";
import { Author, deleteMessage, getAuthorOfMessage, isOwnPkMessage, isPk, loadAuthors } from "./utils";

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
    display: {
        type: OptionType.STRING,
        description: "How to display proxied users in chat\n{tag}, {name}, {memberId}, {pronouns}, {systemId}, {systemName} are valid variables (All lowercase)",
        default: "{name}{tag}",
    },
    load: {
        type: OptionType.COMPONENT,
        component: () => {
            return <Button label={"Load"} onClick = {async () => {
                const system = await pluralKit.api.getSystem({ system: UserStore.getCurrentUser().id });
                const localSystem: Author[] = [];

                (system.members??(await system.getMembers())).forEach((member: Member) => {
                    localSystem.push({
                        messageIds: [],
                        member,
                        system,
                        guildSettings: new Map(),
                        systemSettings: new Map()
                    });
                });

                settings.store.data = JSON.stringify(localSystem);
            }}>LOAD</Button>;
        },
        description: "Load local system into memory"
    },
    showDebug: {
        type: OptionType.BOOLEAN,
        description: "Show debug options",
        default: false
    },
    printData: {
        type: OptionType.COMPONENT,
        component: () => {
            return <Button onClick = {() => {
                console.log(settings.store.data);
            }}>Print Data</Button>;
        },
        description: "Print stored data to console",
        hidden: false // showDebug
    },
    data: {
        type: OptionType.STRING,
        description: "Datastore",
        default: "{}",
        hidden: false // showDebug
    }
});

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
        // make up arrow to edit most recent message work
        // this might conflict with messageLogger, but to be honest, if you're
        // using that plugin, you'll have enough problems with pk already
        // Stolen directly from https://github.com/lynxize/vencord-plugins/blob/plugins/src/userplugins/pk4vc/index.tsx
        {
            find: "getLastEditableMessage",
            replacement: {
                match: /return (.)\(\)\(this.getMessages\((.)\).{10,100}:.\.id\)/,
                replace: "return $1()(this.getMessages($2).toArray()).reverse().find(msg => $self.isOwnMessage(msg)"
            }
        },/*
        {
            find: "\"UserPopoutExperimentWrapper: user cannot be undefined\"",
            replacement: {
                match: /a.default.getUser\(\i\)/,
                replace: "{$self.getUser(arguments[0]);}"
            },
        }*/
    ],

    getUser: (arg: { userId: string, user: User|undefined }) => {
        const user: User = UserStore.getUser(arg.userId);
        arg.user = user;
        if (!user.bot || !user.username) return arg.user;
        user.bio = "Test Bio";
        user.discriminator= "0001";
        user.bot = false;
        arg.user = user;
        console.log(arg);
        return arg.user;
    },

    isOwnMessage: (message: Message) => isOwnPkMessage(message, settings.store.data) || message.author.id === UserStore.getCurrentUser().id,

    renderUsername: ({ author, message, isRepliedMessage, withMentionPrefix }) => {
        const prefix = isRepliedMessage && withMentionPrefix ? "@" : "";
        try {
            const discordUsername = author.nick??author.displayName??author.username;
            if (!isPk(message)) {
                console.log("not pk", message.id);
                return <>{prefix}{discordUsername}</>;
            }


            let color: string = "666666";
            const pkAuthor = getAuthorOfMessage(message, pluralKit.api);

            if (pkAuthor.member && settings.store.colorNames) {
                color = pkAuthor.member.color??color;
            }
            const member: Member = pkAuthor.member as Member;
            const memberSettings = pkAuthor.guildSettings?.get(ChannelStore.getChannel(message.channel_id).guild_id);
            const systemSettings = pkAuthor.systemSettings?.get(ChannelStore.getChannel(message.channel_id).guild_id);

            const name = memberSettings?.display_name??member.display_name??member.name;
            const { pronouns } = member;
            const tag = (systemSettings&&systemSettings.tag)?systemSettings.tag:pkAuthor.system.tag;

            const resultText = settings.store.display
                .replace("{name}", name)
                .replace("{pronouns}", pronouns??"")
                .replace("{tag}", tag??"")
                .replace("{memberid}", member.id)
                .replace("{systemid}", pkAuthor.system.id)
                .replace("{systemname}", pkAuthor.system.name??"");


            return <span style={{
                color: `#${color}`,
            }}>{resultText}</span>;
        } catch {
            return <>{prefix}{author?.nick}</>;
        }
    },

    api: new PKAPI({
        token: "H2hS5SgyjWN/dpPKyx5Lrc8ggWsqgMHEQqsr9nXL5X6Eg2FF2/6XKsBjQhhgr2F+"
    }),

    async start() {
        await loadAuthors();

        console.log("wasd", settings.store.data);

        addButton("pk-edit", msg => {
            if (!msg) return null;
            if (!isOwnPkMessage(msg, settings.store.data)) return null;

            return {
                label: "Edit",
                icon: () => {
                    return <EditIcon/>;
                },
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => MessageActions.startEditMessage(msg.channel_id, msg.id, msg.content),
                onContextMenu: _ => {}
            };
        });

        addButton("pk-delete", msg => {
            if (!msg) return null;
            if (!isOwnPkMessage(msg, settings.store.data)) return null;

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


        // Stolen directly from https://github.com/lynxize/vencord-plugins/blob/plugins/src/userplugins/pk4vc/index.tsx
        this.preEditListener = addPreEditListener((channelId, messageId, messageObj) => {
            if (isPk(MessageStore.getMessage(channelId, messageId))) {
                const { guild_id } = ChannelStore.getChannel(channelId);
                MessageActions.sendMessage(channelId, {
                    reaction: false,
                    content: "pk;e https://discord.com/channels/" + guild_id + "/" + channelId + "/" + messageId + " " + messageObj.content
                });
                // return {cancel: true}
                // note that presumably we're sending off invalid edit requests, hopefully that doesn't cause issues
                // todo: look into closing the edit box without sending a bad edit request to discord
            }
        });
    },
    stop() {
        removeButton("pk-edit");
    },
});


