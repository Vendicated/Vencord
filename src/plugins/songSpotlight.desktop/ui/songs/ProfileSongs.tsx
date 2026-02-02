/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { LinkIcon, PencilIcon } from "@components/Icons";
import { listData } from "@plugins/songSpotlight.desktop/lib/api";
import { useAuthorizationStore } from "@plugins/songSpotlight.desktop/lib/store/AuthorizationStore";
import { useSongStore } from "@plugins/songSpotlight.desktop/lib/store/SongStore";
import { cl, sid } from "@plugins/songSpotlight.desktop/lib/utils";
import { CardClasses, MoreHorizontalIcon, OverlayClasses, Spinner } from "@plugins/songSpotlight.desktop/ui/common";
import { openManageSongs } from "@plugins/songSpotlight.desktop/ui/settings/ManageSongs";
import { copyWithToast } from "@utils/discord";
import { LazyComponent } from "@utils/lazyReact";
import { classes } from "@utils/misc";
import { ContextMenuApi, FluxDispatcher, Menu, React, Tooltip, useEffect, UserStore, useState } from "@webpack/common";

import { SongInfoContainer } from "./SongInfo";

interface ProfileSongsProps {
    userId: string;
}

export const ProfileSongs = LazyComponent(
    () =>
        React.memo(function ProfileSongs({ userId }: ProfileSongsProps) {
            const [failed, setFailed] = useState(false);
            const { isAuthorized } = useAuthorizationStore();
            const { users } = useSongStore();

            const data = users[userId]?.data, at = users[userId]?.at;
            useEffect(() => {
                if (isAuthorized() && !data) listData(userId).catch(() => setFailed(true));
            }, [isAuthorized()]);

            const owned = UserStore.getCurrentUser().id === userId;

            if (isAuthorized() && !data && !failed) {
                return <Spinner type={Spinner.Type.WANDERING_CUBES} />;
            } else if (!data?.[0]) {
                return null;
            }

            return (
                <div
                    className={classes(OverlayClasses.overlay, CardClasses.card, cl("songs-container"))}
                    key="song-spotlight-profile-songs"
                >
                    <Flex justifyContent="space-between">
                        <BaseText size="xs" weight="semibold" className={cl("header")}>Song Spotlight</BaseText>
                        <Tooltip text="More">
                            {props => (
                                <MoreHorizontalIcon
                                    {...props}
                                    onClick={e =>
                                        ContextMenuApi.openContextMenu(e, () => (
                                            <Menu.Menu
                                                navId="vc-songspotlight-profile-songs"
                                                onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                                                aria-label={"Profile songs"}
                                            >
                                                {owned && (
                                                    <Menu.MenuItem
                                                        id="edit-songs"
                                                        label="Edit songs"
                                                        icon={PencilIcon}
                                                        action={() => openManageSongs()}
                                                    />
                                                )}
                                                <Menu.MenuItem
                                                    id="copy-link"
                                                    label="Copy JSON"
                                                    icon={LinkIcon}
                                                    action={() => copyWithToast(JSON.stringify(data))}
                                                />
                                            </Menu.Menu>
                                        ))}
                                    size="xs"
                                    className={cl("icon", "songs-more")}
                                />
                            )}
                        </Tooltip>
                    </Flex>
                    <Flex flexDirection="column" gap="6px">
                        {data.map((song, i) => (
                            <SongInfoContainer owned={owned} song={song} index={i} key={sid(song)} />
                        ))}
                    </Flex>
                </div>
            );
        }),
);
