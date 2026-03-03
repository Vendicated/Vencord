/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/index";
import { Native } from "@equicordplugins/songSpotlight.desktop/service";
import { CardClasses, ContainerClasses, OverlayClasses, Spinner } from "@equicordplugins/songSpotlight.desktop/ui/common";
import { RenderSongInfo } from "@song-spotlight/api/handlers";
import { UserData } from "@song-spotlight/api/structs";
import { sid } from "@song-spotlight/api/util";
import { classes } from "@utils/index";
import {
    SelectedChannelStore,
    SelectedGuildStore,
    useEffect,
    useMemo,
    UserProfileActions,
    UserStore,
    useState,
} from "@webpack/common";

import { ProfileSongsProps } from "./ProfileSongs";

const shownSongs = 4;

interface CollapsedProfileSongsProps extends ProfileSongsProps {
    data?: UserData;
}

export default function CollapsedProfileSongs({ data, userId, isSidebar }: CollapsedProfileSongsProps) {
    const [renders, setRenders] = useState(new Map<string, RenderSongInfo>());
    const previews = useMemo(() => data?.slice(0, shownSongs), [data]);

    useEffect(() => {
        setRenders(new Map());
        if (!previews) return;

        for (const song of previews) {
            Native.renderSong(song)
                .catch(() => null)
                .then(info => {
                    if (!info) return;
                    setRenders(renders => new Map(renders).set(sid(song), info));
                });
        }
    }, [previews]);

    return (
        <div
            className={ContainerClasses.breadcrumb}
            aria-label="Song Spotlight"
            role="button"
            tabIndex={0}
            onClick={() => {
                const user = UserStore.getUser(userId);
                if (!user) return;

                const guildId = SelectedGuildStore.getGuildId();
                UserProfileActions.openUserProfileModal({
                    userId,
                    guildId,
                    channelId: SelectedChannelStore.getChannelId(),
                    analyticsLocation: {
                        page: guildId ? "Guild Channel" : "DM Channel",
                        section: "Profile Popout",
                    },
                    tabSection: "SONG_SPOTLIGHT",
                });
            }}
        >
            <div className={classes(OverlayClasses.overlay, ContainerClasses.innerContainer, CardClasses.card)}>
                <BaseText size={isSidebar ? "sm" : "xs"} weight="medium">Song Spotlight</BaseText>
                <div className={ContainerClasses.icons}>
                    {previews && data
                        ? previews.map((song, i) => {
                            const render = renders.get(sid(song));
                            const extra = i === shownSongs - 1 && data.length > shownSongs;

                            return (
                                <div className={ContainerClasses.icon} key={i}>
                                    {render?.thumbnailUrl && (
                                        <img
                                            src={render.thumbnailUrl}
                                            alt={render.label}
                                            className={classes(extra && ContainerClasses.displayCount)}
                                        />
                                    )}
                                    {extra && (
                                        <div className={ContainerClasses.displayCountText}>
                                            <BaseText size="xs" weight="medium">+{data.length - shownSongs}</BaseText>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                        : <Spinner type={Spinner.Type.SPINNING_CIRCLE} />}
                </div>
            </div>
        </div>
    );
}
