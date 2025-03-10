/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { ContextMenuApi, React, Text, TooltipContainer, useEffect, useState, useStateFromStores } from "@webpack/common";

import { SpotifyLrcStore } from "../providers/store";
import settings from "../settings";
import { LyricsContextMenu } from "./ctxMenu";
import { LyricsModal } from "./modal";
import { cl, NoteSvg, useLyrics } from "./util";

function LyricsDisplay() {
    const { ShowMusicNoteOnNoLyrics } = settings.use(["ShowMusicNoteOnNoLyrics"]);
    const { lyricsInfo, lyricRefs, currLrcIndex } = useLyrics();

    const currentLyrics = lyricsInfo?.lyricsVersions[lyricsInfo.useLyric] || null;

    const NoteElement = NoteSvg(cl("music-note"));

    const makeClassName = (index: number): string => {
        if (currLrcIndex === null) return "";

        const diff = index - currLrcIndex;

        if (diff === 0) return cl("current");
        return cl(diff > 0 ? "next" : "prev");
    };

    if (!lyricsInfo) {
        return ShowMusicNoteOnNoLyrics && (
            <div className="vc-spotify-lyrics"
                onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <LyricsContextMenu />)}
            >
                <TooltipContainer text="No synced lyrics found">
                    {NoteElement}
                </TooltipContainer>
            </div>
        );
    }

    return (
        <div
            className="vc-spotify-lyrics"
            onClick={() => openModal(props => <LyricsModal rootProps={props} />)}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <LyricsContextMenu />)}
        >
            {currentLyrics?.map((line, i) => (
                <div ref={lyricRefs[i]} key={i}>
                    <Text
                        variant={currLrcIndex === i ? "text-sm/normal" : "text-xs/normal"}
                        className={makeClassName(i)}
                    >
                        {line.text || NoteElement}
                    </Text>
                </div>
            ))}
        </div>
    );
}

export function Lyrics() {
    const track = useStateFromStores(
        [SpotifyLrcStore],
        () => SpotifyLrcStore.track,
        null,
        (prev, next) => (prev?.id ? prev.id === next?.id : prev?.name === next?.name)
    );

    const device = useStateFromStores(
        [SpotifyLrcStore],
        () => SpotifyLrcStore.device,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([SpotifyLrcStore], () => SpotifyLrcStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide) return null;

    return <LyricsDisplay />;
}
