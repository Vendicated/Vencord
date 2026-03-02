/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { LinkIcon, PencilIcon } from "@components/Icons";
import { listData } from "@equicordplugins/songSpotlight.desktop/lib/api";
import { useAuthorizationStore } from "@equicordplugins/songSpotlight.desktop/lib/stores/AuthorizationStore";
import { useSongStore } from "@equicordplugins/songSpotlight.desktop/lib/stores/SongStore";
import { cl } from "@equicordplugins/songSpotlight.desktop/lib/utils";
import {
    CardClasses,
    MoreHorizontalIcon,
    OverlayClasses,
    Spinner,
} from "@equicordplugins/songSpotlight.desktop/ui/common";
import { openSettingsModal } from "@equicordplugins/songSpotlight.desktop/ui/settings";
import { sid } from "@song-spotlight/api/util";
import { copyWithToast } from "@utils/discord";
import { classes } from "@utils/misc";
import { ContextMenuApi, FluxDispatcher, Menu, React, Tooltip, useEffect, UserStore, useState } from "@webpack/common";

import Song from ".";

interface ProfileSongsProps {
    userId: string;
}

export default function ProfileSongs({ userId }: ProfileSongsProps) {
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
                            width={16}
                            height={16}
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
                                                action={() => openSettingsModal()}
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
                            className={cl("icon", "songs-more")}
                        />
                    )}
                </Tooltip>
            </Flex>
            <Flex flexDirection="column" gap="6px">
                {data.map((song, i) => <Song owned={owned} song={song} index={i} key={sid(song)} />)}
            </Flex>
        </div>
    );
}
