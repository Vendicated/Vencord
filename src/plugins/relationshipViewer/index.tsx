
import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";

import { Margins } from "@utils/margins";
import { Flex } from "@components/Flex";

import { ModalRoot, openModal } from "@utils/modal";

import { definePluginSettings } from "@api/settings";

import definePlugin, { OptionType } from "@utils/types";

import { Menu, Card, Text, RelationshipStore, GuildMemberStore, UserStore } from "@webpack/common";

import { Guild, User } from "discord-types/general";

import { createCollapsableForm, createFormItem, createFormMember } from "./elements";


interface GuildContextProps {
    guild: Guild;
}

const settings = definePluginSettings({
    ["Show Friends"]: {
        type: OptionType.BOOLEAN,
        description: "Show friends in the list",
        default: true
    },

    ["Show Blocked"]: {
        type: OptionType.BOOLEAN,
        description: "Show blocked users in the list",
        default: true
    }
});

const getAvatarURI = (userId: string, avatarId: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarId}`;
};

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

const openRelationships = (guildId: string, guildName: string, ownerId: string) => {
    const ownerUser = UserStore.getUser(ownerId);
    const ownerAvatar = ownerUser && getAvatarURI(ownerId, UserStore.getUser(ownerId)?.avatar) || undefined;

    const relationships = RelationshipStore.getRelationships();

    const friendsInServer = RelationshipStore.getFriendIDs()
        .map(id => GuildMemberStore.getMember(guildId, id) && UserStore.getUser(id));

    const blockedInServer: Array<User> = [];
    for (const id in relationships) {
        const rel = relationships[id];
        if (rel !== 2) continue;

        const user = GuildMemberStore.getMember(guildId, id) && UserStore.getUser(id);
        if (!user) continue;

        blockedInServer.push(user);
    }

    // sort alphabetically by username (frick neon)
    friendsInServer.sort((a, b) => {
        if (!a || !b) return 0;
        return a.username.localeCompare(b.username);
    });

    blockedInServer.sort((a, b) => {
        if (!a || !b) return 0;
        return a.username.localeCompare(b.username);
    });

    const friendsElementArray: Array<React.ReactElement> = [];
    const blockedElementArray: Array<React.ReactElement> = [];

    for (const user of friendsInServer) {
        if (!user) continue;

        friendsElementArray.push(createFormMember(user, guildId, true));
    }

    for (const user of blockedInServer) {
        blockedElementArray.push(createFormMember(user, guildId, true));
    }

    const friendsCount = friendsElementArray.length;
    const blockedCount = blockedElementArray.length;

    updateColorsBasedOnTheme();

    openModal(modalProps => (
        <ModalRoot {...modalProps}>
            <Card className={`${Margins.top16} ${Margins.bottom16} ${Margins.left8} ${Margins.right8}`} style={{ overflowY: "auto" }}>
                <Flex className={Margins.top8} style={{ justifyContent: "center" }}>
                    <Text variant="heading-lg/medium">Server Relations</Text>
                </Flex>

                {createCollapsableForm("Guild Information", [
                    createFormItem("Owner", undefined, createFormMember(ownerUser || "Could not fetch.", guildId)),
                    createFormItem("Name", guildName),
                    createFormItem("ID", guildId),
                ])}

                {settings.store["Show Friends"] && createCollapsableForm("Friends", friendsCount > 0 ? friendsElementArray : [createFormItem("No friends in this server.")], friendsCount)}
                {settings.store["Show Blocked"] && blockedCount > 0 && createCollapsableForm("Blocked", blockedElementArray, blockedCount)}

            </Card>
        </ModalRoot>
    ));
};

const GuildContext: NavContextMenuPatchCallback = (children, { guild: { id, name, ownerId } }: GuildContextProps) => {
    if (!(id && name && ownerId)) return;

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
            action={() =>
                openRelationships(id, name, ownerId)
            }
        />
    ));
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
