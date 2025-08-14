/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { ContextMenuApi, React, Text, TooltipContainer, useEffect, useState, useStateFromStores } from "@webpack/common";

import { settings } from "../../../settings";
import { SpotifyStore } from "../../SpotifyStore";
import { SpotifyLrcStore } from "../providers/store";
import { LyricsContextMenu } from "./ctxMenu";
import { LyricsModal } from "./modal";
import { cl, NoteSvg, useLyrics } from "./util";

const prevCl = cl("prev");
const nextCl = cl("next");
const currentCl = cl("current");

function LyricsDisplay({ scroll = true }: { scroll?: boolean; }) {
    const { ShowMusicNoteOnNoLyrics } = settings.use(["ShowMusicNoteOnNoLyrics"]);
    const { lyricsInfo, lyricRefs, currLrcIndex } = useLyrics({ scroll });

    const currentLyrics = lyricsInfo?.lyricsVersions[lyricsInfo.useLyric] || null;

    const makeClassName = (index: number): string => {
        if (currLrcIndex == null) return prevCl;

        const diff = index - currLrcIndex;

        if (diff === 0) return currentCl;
        return diff > 0 ? nextCl : prevCl;
    };

    return (
        <div
            className="vc-spotify-lyrics"
            onClick={() => openModal(props => <LyricsModal props={props} />)}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <LyricsContextMenu />)}
        >
            {currentLyrics ? currentLyrics.map((line, i) => (
                <div ref={lyricRefs[i]} key={i}>
                    <Text
                        variant={currLrcIndex === i ? "text-sm/normal" : "text-xs/normal"}
                        className={makeClassName(i)}
                    >
                        {line.text || NoteSvg()}
                    </Text>
                </div>
            )) : ShowMusicNoteOnNoLyrics ? (
                <TooltipContainer text="No synced lyrics found">
                    <NoteSvg />
                </TooltipContainer>
            ) : null}
        </div>
    );
}

export function SpotifyLyrics({ scroll = true }: { scroll?: boolean; } = {}) {
    SpotifyLrcStore.init();
    const track = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.track,
        null,
        (prev, next) => (prev?.id ? prev.id === next?.id : prev?.name === next?.name)
    );

    const device = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.device,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide) return null;

    return <LyricsDisplay scroll={scroll} />;
}
