/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import ExpandableHeader from "@components/ExpandableHeader";
import { Heart } from "@components/Heart";
import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import * as Modal from "@utils/modal";
import definePlugin from "@utils/types";
import {
    Avatar, Button, ChannelStore,
    Clickable, Flex, GuildMemberStore,
    GuildStore,
    MessageStore,
    React,
    Text, TextArea, TextInput, Tooltip,
    UserStore
} from "@webpack/common";
import { Guild, User } from "discord-types/general";

interface IUserExtra {
    isOwner?: boolean;
    updatedAt?: number;
}

interface IStorageUser {
    id: string;
    username: string,
    tag: string,
    iconURL?: string;
    extra?: IUserExtra;
}

interface GroupData {
    id: string;
    users: { [key: string]: IStorageUser; };
    name: string;
}

const constants = {
    pluginLabel: "IRememberYou",
    pluginId: "irememberyou",

    DM: "dm",
    DataUIDescription:
        "Provides a list of users you have mentioned or replied to, or those who own the servers you belong to (owner*), or are members of your guild",
    marks: {
        Owner: "owner"
    }
};


class Data {
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
        for (const { user, source, extra } of array) {
            if (user.bot) {
                continue;
            }

            const groupKey = source?.id ?? constants.DM;
            const group = (target[groupKey] ||= {
                name: source?.name || constants.DM,
                id: source?.id || user.id,
                users: {}
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

    storageAutoSaveProtocol() {
        this._storageAutoSaveProtocol_interval = setInterval(
            this.updateStorage.bind(this),
            60_000 * 3
        );
    }
}

class DataUI {
    declare plugin;

    constructor(plugin) {
        this.plugin = plugin;
    }
    start() {
        return this;
    }

    renderSectionDescription() {
        return <Text>{constants.DataUIDescription}</Text>;
    }

    renderUsersCollectionAsRows(usersCollection: Data["usersCollection"]) {
        if (Object.keys(usersCollection).length === 0) {
            return <Text>It's empty right now</Text>;
        }
        const elements = Object.entries(usersCollection)
            .map(([_key, { users, name }]) => ({ name, users: Object.values(users) }))
            .sort((a, b) => b.users.length - a.users.length)
            .map(({ name, users }) =>
                this.renderUsersCollectionRows(name, users)
            );

        return elements;
    }

    renderUsersCollectionRows(key: string, users: IStorageUser[]) {
        const usersElements = users.map(user => this.renderUserRow(user));


        return <aside key={key} >
            <ExpandableHeader defaultState={true} headerText={key.toUpperCase()}>
                <Flex style={{ gap: "calc(0.5em + 0.5vw) 0.2em", flexDirection: "column" }}>
                    {usersElements}
                </Flex>
            </ExpandableHeader>

        </aside>;
    }

    renderUserAvatar(user: IStorageUser) {
        return <Clickable onClick={() => openUserProfile(user.id)}>
            <span style={{ cursor: "pointer" }} >
                <Avatar src={user.iconURL} size="SIZE_24" />
            </span>
        </Clickable>;
    }
    userTooltipText(user: IStorageUser) {
        const { updatedAt } = user.extra || {};
        const updatedAtContent = updatedAt ? new Intl.DateTimeFormat().format(updatedAt) : null;
        return `${user.username ?? user.tag}, updated at ${updatedAtContent}`;
    }

    renderUserRow(user: IStorageUser, allowExtra: { owner?: boolean; } = {}) {
        allowExtra = Object.assign({ owner: true }, allowExtra);

        return <Flex key={user.id} style={{ margin: 0, width: "100%", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ width: "24em" }}>
                <Flex style={{ gap: "0.5em", alignItems: "center", margin: 0, wordBreak: "break-word" }}>
                    {this.renderUserAvatar(user)}
                    <Tooltip text={this.userTooltipText(user)}>
                        {props =>
                            <Text {...props} selectable>{user.tag} {allowExtra.owner && user.extra?.isOwner && `(${constants.marks.Owner})`}</Text>
                        }
                    </Tooltip>
                </Flex>
            </span>

            <span style={{ height: "min-content" }}><Text selectable variant="code" style={{ opacity: 0.75 }}>{user.id}</Text></span>
        </Flex>;
    }

    renderButtonsFooter(usersCollection: Data["usersCollection"]) {
        return <footer>
            <Flex style={{ gap: "1.5em", marginTop: "2em" }}>

                <Clickable onClick={() => Modal.openModal(props => <Modal.ModalRoot size={Modal.ModalSize.LARGE} fullscreenOnMobile={true} {...props}>
                    <Modal.ModalHeader separator={false}>
                        <Text
                            color="header-primary"
                            variant="heading-lg/semibold"
                            tag="h1"
                            style={{ flexGrow: 1 }}
                        >
                            Editor
                        </Text>
                        <Modal.ModalCloseButton onClick={props.onClose} />
                    </Modal.ModalHeader>
                    <Modal.ModalContent>
                        <Flex style={{ paddingBlock: "0.5em", gap: "0.75em" }}>
                            <Button label="Validate and save" >Validate and save</Button>
                            <Button label="Cancel" color={Button.Colors.TRANSPARENT}>Cancel</Button>
                        </Flex>
                        <TextArea value={JSON.stringify(usersCollection, null, "\t")} onChange={() => { }} rows={20} />
                    </Modal.ModalContent>
                </Modal.ModalRoot>)}>
                    <Text variant="eyebrow" style={{ cursor: "pointer" }} >Open editor</Text>
                </Clickable>

                <Clickable onClick={
                    async () => {
                        const confirmed = confirm("Sure?");
                        if (!confirmed) {
                            return;
                        }

                        const { plugin } = this;
                        const data = plugin.dataManager as Data;
                        data.usersCollection = {};
                        await data.updateStorage();
                    }
                }><Text style={{ cursor: "pointer" }}>Reset storage</Text>
                </Clickable>
            </Flex>
        </footer >;
    }

    renderSearchElement(usersCollection: Data["usersCollection"]) {
        const [current, setState] = React.useState<string>();
        const map: Map<string, IStorageUser> = Object.values(usersCollection)
            .reduce((acc, { users }) => (acc.push(...Object.values(users)), acc), [] as IStorageUser[])
            .reduce((acc, current) => acc.set(current.id, current), new Map());

        const list = [...map.values()];

        return <section style={{ paddingBlock: "1em" }}>
            <TextInput placeholder="Filter by tag, username" name="Filter" onChange={value => setState(value)} />
            {current &&
                <Flex style={{ flexDirection: "column", gap: "0.5em", paddingTop: "1em" }}>
                    {list.filter(user => user.tag.includes(current) || user.username.includes(current))
                        .map(user => this.renderUserRow(
                            user,
                            { owner: false }
                        ))
                    }
                </Flex>
            }
        </section>;
    }

    toElement(usersCollection: Data["usersCollection"]) {
        return (
            /*
          > ![Important]
          > Let me know a more promising color, instead of #ffffff
          */
            <main style={{ color: "#ffffff", paddingBottom: "4em" }}>
                <Text tag="h1" variant="heading-lg/bold">
                    {constants.pluginLabel}{" "}
                    <Heart />
                </Text>


                {this.renderSectionDescription()}
                <br />
                {this.renderSearchElement(usersCollection)}
                <Flex style={{ gap: "1.5em", flexDirection: "column" }}>
                    {this.renderUsersCollectionAsRows(usersCollection)}
                </Flex>
                {this.renderButtonsFooter(usersCollection)}
            </main>

        );
    }
}

export default definePlugin({
    name: "IRememberYou",
    description: "Locally saves everyone you've been communicating with (including servers), in case of lose",
    authors: [Devs.zoodogood],
    dependencies: ["MessageEventsAPI"],
    patches: [],

    async start() {
        const data = (this.dataManager = await new Data().withStart());
        const ui = (this.uiManager = await new DataUI(this).start());

        await data.initializeUsersCollection();
        data.writeGuildsOwnersToCollection();
        data.writeMembersFromUserGuildsToCollection();
        data._onMessagePreSend_preSend = addPreSendListener(
            data.onMessagePreSend.bind(data)
        );
        data.storageAutoSaveProtocol();

        // @ts-ignore
        Vencord.Plugins.plugins.Settings.customSections.push(ID => ({
            section: `${constants.pluginId}.display-data`,
            label: constants.pluginLabel,
            element: () => ui.toElement(data.usersCollection),
        }));
    },

    stop() {
        const dataManager = this.dataManager as Data;

        removePreSendListener(dataManager._onMessagePreSend_preSend);
        clearInterval(dataManager._storageAutoSaveProtocol_interval);
    },
});
