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

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { sleep, useForceUpdater } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Queue } from "@utils/Queue";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, Menu, React, RelationshipStore, Text, Tooltip, UserStore, useStateFromStores } from "@webpack/common";

const UserProfileStore = findStoreLazy("UserProfileStore");

const fetchQueueFinishCallbacks: Set<() => any> = new Set();
const fetchQueue = new Proxy(new Queue(), {
    set(_, p, newValue) {
        if (p === "promise" && newValue === undefined) {
            for (const fetchQueueFinishCallback of fetchQueueFinishCallbacks) {
                fetchQueueFinishCallback();
            }
        }

        // @ts-expect-error
        return Reflect.set(...arguments);
    }
});

let fetchUserProfile: (id: string, options: { withMutualGuilds: boolean; }) => any;
function setFetchUserProfile(func: (id: string, options: { withMutualGuilds: boolean; }) => any) {
    fetchUserProfile = func;
}

function fetchMissingFriendProfiles() {
    if (fetchQueue.size > 0) return;

    const friendsIds = RelationshipStore.getFriendIDs();

    const { mutualGuilds } = UserProfileStore.__getLocalVars();
    const friendsIdsToFetch = friendsIds.filter(friendId => mutualGuilds[friendId] === void 0);

    for (const friendId of friendsIdsToFetch) {
        fetchQueue.push(async () => {
            await fetchUserProfile?.(friendId, { withMutualGuilds: true });
            await sleep(750);
        });
    }
}

function FriendsOnServerModal({ guildId, modalProps }: { guildId: string; modalProps: ModalProps; }) {
    const friendIds = useStateFromStores(
        [UserProfileStore],
        () => Object.entries(UserProfileStore.__getLocalVars().mutualGuilds)
            .filter(([, mutualGuilds]) => (mutualGuilds as any)
                .some(({ guild }) => guild.id === guildId))
            .map(([friendId]) => friendId),
        null,
        (old, current) => JSON.stringify(old) === JSON.stringify(current)
    );

    const forceUpdate = useForceUpdater();

    React.useEffect(() => {
        fetchMissingFriendProfiles();

        const fetchQueueFinishCallback = () => forceUpdate();

        fetchQueueFinishCallbacks.add(fetchQueueFinishCallback);
        return () => void fetchQueueFinishCallbacks.delete(fetchQueueFinishCallback);
    }, []);

    return (
        <ErrorBoundary>
            <ModalRoot
                {...modalProps}
                size={ModalSize.MEDIUM}
            >
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Friends on this server:</Text>
                    <ModalCloseButton onClick={modalProps.onClose} />
                </ModalHeader>
                <ModalContent>
                    {fetchQueue.size > 0 && (
                        <Text variant="text-md/semibold" style={{ marginTop: 8, padding: 8, borderRadius: 5, backgroundColor: "var(--background-tertiary)", textAlign: "center" }}
                        >Fetching friends...</Text>
                    )}
                    <div style={{ marginTop: 8, padding: 16, borderRadius: 5, backgroundColor: "var(--background-tertiary)", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", textAlign: "center" }}>
                        {friendIds.length === 0
                            ? <Text variant="text-md/normal">There are no friends on this server :/</Text>
                            : friendIds.map(friendId => {
                                const user = UserStore.getUser(friendId);

                                return (
                                    <Tooltip text={user.tag}>
                                        {tooltipProps => (
                                            <button
                                                {...tooltipProps}
                                                onClick={() => FluxDispatcher.dispatch({ type: "USER_PROFILE_MODAL_OPEN", userId: friendId })}
                                                style={{ all: "unset", cursor: "pointer" }}
                                            >
                                                <img
                                                    src={user.getAvatarURL(void 0, void 0, false)}
                                                    style={{ borderRadius: "50%", width: 50, height: 50 }}
                                                />
                                            </button>
                                        )}
                                    </Tooltip>
                                );
                            })}
                    </div>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary >
    );
}

const guildContextMenuPatch: NavContextMenuPatchCallback = (children, args) => {
    if (!args?.[0]) return;

    const group = findGroupChildrenByChildId("privacy", children);
    if (group && !group.some(child => child?.props?.id === "friends-on-server"))
        group.push((
            <Menu.MenuItem
                id="friends-on-server"
                key="friends-on-server"
                label="Friends On Server"
                action={() => openModal(modalProps => <FriendsOnServerModal guildId={args[0].guild.id} modalProps={modalProps} />)}
            />
        ));
};

export default definePlugin({
    name: "FriendsOnServer",
    description: "Adds an option to guild context menus to show what friends are on that guild.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: '("UserProfileModalActionCreators")',
            replacement: {
                match: /USER_PROFILE_FETCH_START.+?apply\(this,arguments\)}(?<=function (\i)\(\){\i=.+?)/,
                replace: (m, func) => `${m}$self.setFetchUserProfile(${func});`
            }
        }
    ],

    setFetchUserProfile,

    start() {
        addContextMenuPatch("guild-context", guildContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("guild-context", guildContextMenuPatch);
    }
});
