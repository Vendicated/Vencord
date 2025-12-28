/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { TooltipContainer } from "@components/TooltipContainer";
import { settings } from "@equicordplugins/musicControls/settings";
import { TidalLrcStore } from "@equicordplugins/musicControls/tidal/lyrics/providers/store";
import { TidalStore } from "@equicordplugins/musicControls/tidal/TidalStore";
import { openModal } from "@utils/modal";
import { ContextMenuApi, useEffect, useState, useStateFromStores } from "@webpack/common";

import { LyricsContextMenu } from "./ctxMenu";
import { LyricsModal } from "./modal";
import { cl, NoteSvg, useLyrics } from "./util";

function LyricsDisplay({ scroll = true }: { scroll?: boolean; }) {
    const { ShowMusicNoteOnNoLyrics } = settings.use(["ShowMusicNoteOnNoLyrics"]);
    const { lyrics, lyricRefs } = useLyrics({ scroll });
    const currentLyrics = lyrics || null;
    const NoteElement = NoteSvg(cl("music-note"));
    const position = useStateFromStores([TidalStore], () => TidalStore.mPosition / 1000);

    const currLrcIndex = currentLyrics
        ? currentLyrics.findIndex((line, i) => {
            const nextLineTime = currentLyrics[i + 1]?.time ?? Infinity;
            return position >= line.time && position < nextLineTime;
        })
        : null;

    const makeClassName = (index: number) => {
        if (currLrcIndex === null) return "";
        const diff = index - currLrcIndex;
        return cl(diff === 0 ? "current" : diff > 0 ? "next" : "prev");
    };

    if (!currentLyrics) {
        return ShowMusicNoteOnNoLyrics ? (
            <div className="eq-tidal-lyrics"
                onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <LyricsContextMenu />)}
            >
                <TooltipContainer text="No lyrics found">
                    {NoteElement}
                </TooltipContainer>
            </div>
        ) : null;
    }

    return (
        <div
            className="eq-tidal-lyrics"
            onClick={() => openModal(props => <LyricsModal rootProps={props} />)}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <LyricsContextMenu />)}
        >
            {currentLyrics.map((line, i) => (
                <div ref={lyricRefs[i]} key={i}>
                    <BaseText size={currLrcIndex === i ? "sm" : "xs"} className={makeClassName(i)}>
                        {line.text || NoteElement}
                    </BaseText>
                </div>
            ))}
        </div>
    );
}

export function TidalLyrics({ scroll = true }: { scroll?: boolean; } = {}) {
    TidalLrcStore.init();
    const track = useStateFromStores(
        [TidalStore],
        () => TidalStore.track,
        null,
        (prev, next) => (prev?.id ? prev.id === next?.id : prev?.name === next?.name)
    );

    const isPlaying = useStateFromStores([TidalStore], () => TidalStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || shouldHide) return null;

    return <LyricsDisplay scroll={scroll} />;
}
