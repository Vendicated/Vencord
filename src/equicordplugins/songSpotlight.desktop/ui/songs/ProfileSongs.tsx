/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { LinkIcon, PencilIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { listData } from "@equicordplugins/songSpotlight.desktop/lib/api";
import { useAuthorizationStore } from "@equicordplugins/songSpotlight.desktop/lib/stores/AuthorizationStore";
import { useSongStore } from "@equicordplugins/songSpotlight.desktop/lib/stores/SongStore";
import { cl } from "@equicordplugins/songSpotlight.desktop/lib/utils";
import settings from "@equicordplugins/songSpotlight.desktop/settings";
import {
    CardClasses,
    MoreHorizontalIcon,
    OverlayClasses,
    Spinner,
} from "@equicordplugins/songSpotlight.desktop/ui/common";
import { openSettingsModal } from "@equicordplugins/songSpotlight.desktop/ui/settings";
import { sid } from "@song-spotlight/api/util";
import { copyWithToast } from "@utils/discord";
import { classes } from "@utils/index";
import { User } from "@vencord/discord-types";
import {
    ContextMenuApi,
    FluxDispatcher,
    Menu,
    React,
    Tooltip,
    useEffect,
    useMemo,
    UserStore,
    useState,
} from "@webpack/common";

import Song from ".";
import CollapsedProfileSongs from "./CollapsedProfileSongs";

export interface ProfileSongsProps {
    user: User;
    isSideBar: boolean;
}

export default function ProfileSongs({ user, isSideBar }: ProfileSongsProps) {
    const [failed, setFailed] = useState(false);
    const { isAuthorized } = useAuthorizationStore();
    const { users } = useSongStore();
    const { profileSongsLimit, collapseSongList } = settings.use();
    const userId = user?.id;
    const data = users[userId]?.data;
    useEffect(() => {
        if (isAuthorized() && !data) listData(userId).catch(() => setFailed(true));
    }, [isAuthorized()]);

    const [clamped, setClamped] = useState(true);
    const clampedData = useMemo(() => data && (clamped ? data.slice(0, profileSongsLimit) : data), [
        data,
        clamped,
        profileSongsLimit,
    ]);

    const owned = UserStore.getCurrentUser().id === userId;

    const pending = isAuthorized() && !clampedData && !data && !failed;
    if (!pending && !clampedData?.[0]) return null;

    if (collapseSongList) {
        return (
            <CollapsedProfileSongs
                data={data}
                user={user}
                isSideBar={isSideBar}
            />
        );
    } else if (pending) {
        return <Spinner type={Spinner.Type.WANDERING_CUBES} />;
    }

    return (
        <div
            className={classes(
                isSideBar && OverlayClasses.overlay,
                isSideBar && CardClasses.card,
                cl("songs-container", isSideBar && "songs-container-sidebar"),
            )}
            key="song-spotlight-profile-songs"
        >
            <Flex justifyContent="space-between">
                <BaseText size="xs" weight={isSideBar ? "semibold" : "medium"} className={cl("header")}>
                    Song Spotlight
                </BaseText>
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
                {clampedData.map((song, i) => <Song owned={owned} song={song} index={i} key={sid(song)} />)}
            </Flex>
            {clamped && data.length > profileSongsLimit && (
                <Link
                    onClick={() => setClamped(false)}
                >
                    <BaseText size="sm" weight="medium" className={cl("sub")} style={{ textAlign: "center" }}>
                        Show {data.length - profileSongsLimit} more
                    </BaseText>
                </Link>
            )}
        </div>
    );
}
