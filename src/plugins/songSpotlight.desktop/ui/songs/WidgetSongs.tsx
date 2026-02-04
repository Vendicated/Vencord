/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { listData } from "@plugins/songSpotlight.desktop/lib/api";
import { useAuthorizationStore } from "@plugins/songSpotlight.desktop/lib/store/AuthorizationStore";
import { useSongStore } from "@plugins/songSpotlight.desktop/lib/store/SongStore";
import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { Spinner, WidgetClasses } from "@plugins/songSpotlight.desktop/ui/common";
import { openManageSongs } from "@plugins/songSpotlight.desktop/ui/settings/ManageSongs";
import { sid } from "@song-spotlight/api/util";
import { LazyComponent } from "@utils/lazyReact";
import { classes } from "@utils/misc";
import { User } from "@vencord/discord-types";
import { React, ScrollerThin, useEffect, UserStore, useState } from "@webpack/common";
import { JSX } from "react";

import { SongInfoContainer } from "./SongInfo";

interface WidgetSongsProps {
    user: User;
}

export const WidgetSongs = LazyComponent(
    () =>
        React.memo(function WidgetSongs({ user }: WidgetSongsProps) {
            const [failed, setFailed] = useState(false);
            const { isAuthorized } = useAuthorizationStore();
            const { users } = useSongStore();

            const data = users[user.id]?.data;
            useEffect(() => {
                if (isAuthorized() && !data) listData(user.id).catch(() => setFailed(true));
            }, [isAuthorized()]);

            const owned = UserStore.getCurrentUser().id === user.id;

            let full: JSX.Element | undefined;
            if (failed) {
                full = (
                    <BaseText size="md" weight="semibold" className={cl("errored")}>
                        Uh oh! Song Spotlight failed to load. You can check the console for more details.
                    </BaseText>
                );
            } else if (isAuthorized() && !data) {
                full = <Spinner type={Spinner.Type.SPINNING_CIRCLE} />;
            } else if (!data?.[0]) {
                full = (
                    <>
                        <BaseText size="lg" weight="semibold">Looks like there's nothing here!</BaseText>
                        <BaseText size="md" weight="normal">
                            {owned
                                ? "Well? What are you waiting for? Go add some songs to your Song Spotlight!"
                                : `Tell ${user.globalName || user.username} to add some songs to their Song Spotlight!`}
                        </BaseText>
                        {owned && (
                            <Button
                                variant="secondary"
                                style={{ marginTop: "14px", flexShrink: 1 }}
                                onClick={() => openManageSongs()}
                            >
                                Edit songs
                            </Button>
                        )}
                    </>
                );
            }

            return (
                <ScrollerThin
                    fade
                    className={classes(WidgetClasses.tabPanelScroller, cl("widget-container"))}
                    key="song-spotlight-widget-songs"
                >
                    <Flex
                        flexDirection="column"
                        justifyContent={full && "center"}
                        alignItems={full && "center"}
                        gap={full ? "8px" : "10px"}
                        style={full && { flex: 1, textAlign: "center" }}
                    >
                        {full
                            || data.map((song, i) => (
                                <SongInfoContainer owned={owned} song={song} index={i} big key={sid(song)} />
                            ))}
                    </Flex>
                </ScrollerThin>
            );
        }),
);
