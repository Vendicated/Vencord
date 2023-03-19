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

import "./style.css";

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { FluxDispatcher, GuildMemberStore, Menu, React, RelationshipStore, Text, Tooltip, UserStore, useStateFromStores } from "@webpack/common";

function FriendsOnServer({ guildId, modalProps }: { guildId: string; modalProps: ModalProps; }) {
    const friendIds = useStateFromStores(
        [RelationshipStore],
        () => RelationshipStore.getFriendIDs(),
        null,
        (old, current) => JSON.stringify(old) === JSON.stringify(current)
    );

    useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.getMemberIds(guildId),
        null,
        (old, current) => old.length === current.length
    );

    const friendsToRequest = friendIds.filter(friendId => !GuildMemberStore.isMember(guildId, friendId));

    React.useEffect(() => {
        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: [guildId],
            userIds: friendsToRequest
        });
    }, []);

    const friendsInGuild = friendIds.filter(friendId => GuildMemberStore.isMember(guildId, friendId));

    return (
        <ErrorBoundary>
            <ModalRoot
                {...modalProps}
                size={ModalSize.MEDIUM}
            >
                <ModalHeader>
                    <Text className="frds-on-svr-title" variant="heading-lg/semibold">Friends on this server:</Text>
                    <ModalCloseButton onClick={modalProps.onClose} />
                </ModalHeader>
                <ModalContent>
                    <div className="frds-on-svr-frds-container">
                        {friendsInGuild.length === 0
                            ? <Text variant="text-md/normal">There are no friends on this server :/</Text>
                            : friendsInGuild.map(friendId => {
                                const user = UserStore.getUser(friendId);

                                return (
                                    <Tooltip text={user?.tag ?? "Unknown User"}>
                                        {tooltipProps => (
                                            <button
                                                {...tooltipProps}
                                                className="frds-on-svr-open-modal-btn"
                                                onClick={() => FluxDispatcher.dispatch({ type: "USER_PROFILE_MODAL_OPEN", userId: friendId })}
                                            >
                                                <img
                                                    className="frds-on-svr-avatar-img"
                                                    src={user?.getAvatarURL(void 0, void 0, false)}
                                                />
                                            </button>
                                        )}
                                    </Tooltip>
                                );
                            })}
                    </div>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary>
    );
}

const guildContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    const group = findGroupChildrenByChildId("privacy", children);
    if (group && !group.some(child => child?.props?.id === "friends-on-server")) {
        group.push((
            <Menu.MenuItem
                id="friends-on-server"
                key="friends-on-server"
                label="Friends On Server"
                action={() => openModal(modalProps => <FriendsOnServer guildId={props.guild.id} modalProps={modalProps} />)}
            />
        ));
    }
};

export default definePlugin({
    name: "FriendsOnServer",
    description: "Adds an option to server context menus to show what friends are on that server.",
    authors: [Devs.Nuckyz],


    start() {
        addContextMenuPatch("guild-context", guildContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("guild-context", guildContextMenuPatch);
    }
});
