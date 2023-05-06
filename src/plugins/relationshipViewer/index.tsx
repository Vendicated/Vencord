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

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Margins } from "@utils/margins";
import { ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Card, FluxDispatcher, GuildMemberStore, Menu, React, RelationshipStore, Text, UserStore } from "@webpack/common";
import { Guild, User } from "discord-types/general";

import { createCollapsableForm, createFormItem, createFormMember } from "./elements";

interface GuildContextProps {
    guild: Guild;
}

const settings = definePluginSettings({
    "Show Friends": {
        type: OptionType.BOOLEAN,
        description: "Show friends in the list",
        default: true
    },

    "Show Blocked": {
        type: OptionType.BOOLEAN,
        description: "Show blocked users in the list",
        default: true
    }
});

const updateColorsBasedOnTheme = () => {
    const currentTheme = document.querySelector(".theme-dark") ? "dark" : "light";
    if (currentTheme === "dark") {
        document.documentElement.style.setProperty("--expandable", "#ffffff79");
        document.documentElement.style.setProperty("--scrollbar-track", "#ebebeb4b");
        document.documentElement.style.setProperty("--scrollbar-thumb", "#ffffff79");
    } else {
        document.documentElement.style.setProperty("--expandable", "#6d6d6d");
        document.documentElement.style.setProperty("--scrollbar-track", "#ebebeb");
        document.documentElement.style.setProperty("--scrollbar-thumb", "#6d6d6d");
    }
};

const getUnloadedIds = (ids: Array<string>, guildId: string) => {
    const unloadedIds: Array<string> = [];
    for (const id of ids) {
        if (!GuildMemberStore.getMember(guildId, id)) unloadedIds.push(id);
    }

    return unloadedIds;
};

const OpenRelationships = ({ guildId, ownerId, guildName, modalProps }: { guildId: string, ownerId: string, guildName: string, modalProps: ModalProps; }) => {
    const ownerUser = UserStore.getUser(ownerId);

    const relationships = RelationshipStore.getRelationships();

    const friendIds = RelationshipStore.getFriendIDs();
    const blockedIds: Array<string> = [];

    const friendsInServer = friendIds
        .map(id => GuildMemberStore.getMember(guildId, id) && UserStore.getUser(id));

    const blockedInServer: Array<User> = [];
    for (const id in relationships) {
        const rel = relationships[id];
        if (rel !== 2) continue;

        blockedIds.push(id);

        const user = GuildMemberStore.getMember(guildId, id) && UserStore.getUser(id);
        if (!user) continue;

        blockedInServer.push(user);
    }

    const friendsElementArray: Array<React.ReactElement> = [];
    const blockedElementArray: Array<React.ReactElement> = [];

    for (const user of friendsInServer) {
        if (!user) {
            continue;
        }

        friendsElementArray.push(createFormMember(user, guildId, true));
    }

    for (const user of blockedInServer) {
        blockedElementArray.push(createFormMember(user, guildId, true));
    }

    const friendsCount = friendsElementArray.length;
    const blockedCount = blockedElementArray.length;

    React.useEffect(() => {
        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: [guildId],
            userIds: [!ownerUser && ownerId, ...getUnloadedIds(friendIds, guildId), ...getUnloadedIds(blockedIds, guildId)]
        });
    });

    updateColorsBasedOnTheme();

    return (
        <ModalRoot
            {...modalProps}
            size={ModalSize.MEDIUM}
        >
            <ModalHeader>
                <Text className={Margins.top8} variant="heading-lg/medium">Server Relations</Text>
            </ModalHeader>

            <Card id="scrollstylerelatiowon" className={`${Margins.top16} ${Margins.bottom16} ${Margins.left8} ${Margins.right8}`} style={{ overflowY: "auto" }}>
                {createCollapsableForm("Guild Information", [
                    createFormItem("Owner", undefined, createFormMember(ownerUser || "Could not fetch.", guildId)),
                    createFormItem("Name", guildName),
                    createFormItem("ID", guildId),
                ])}

                {settings.store["Show Friends"] && createCollapsableForm("Friends", friendsCount > 0 ? friendsElementArray : [createFormItem("No friends in this server.")], friendsCount)}
                {settings.store["Show Blocked"] && blockedCount > 0 && createCollapsableForm("Blocked", blockedElementArray, blockedCount)}
            </Card>
        </ModalRoot>
    );
};

const createGuildUI = (children, { id, ownerId, name }: Guild) => {
    return () => {
        // what the fuck what the fuck what the fuck
        const privacyElements = children.find(
            c => c?.props?.children?.[c.props.children.length - 1]?.props?.id === "change-nickname"
        );

        if (!privacyElements) return;

        const idx = privacyElements.props.children.length - 2;

        privacyElements.props.children.splice(idx, 0, (
            <Menu.MenuItem
                id="view-relationships"
                label="View Relationships"
                action={() => openModal(modalProps => <OpenRelationships guildId={id} ownerId={ownerId} guildName={name} modalProps={modalProps} />)}
            />
        ));
    };
};

const GuildContext: NavContextMenuPatchCallback = (children, { guild }: GuildContextProps) => {
    return createGuildUI(children, guild);
};

export default definePlugin({
    name: "RelationshipViewer",
    description: "Allows you to view your relationship circle within the server.",
    authors: [
        {
            id: 734367577563987969n,
            name: "Magik Manz",
        },
    ],

    settings,

    start() {
        addContextMenuPatch("guild-context", GuildContext);
    },

    stop() {
        removeContextMenuPatch("guild-context", GuildContext);
    }
});
