/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { ContextMenuApi, Text, TooltipContainer, useEffect, useState, useStateFromStores } from "@webpack/common";

import { settings } from "../../../settings";
import { TidalStore } from "../../TidalStore";
import { TidalLrcStore } from "../providers/store";
import { LyricsContextMenu } from "./ctxMenu";
import { LyricsModal } from "./modal";
import { cl, NoteSvg, useLyrics } from "./util";

function LyricsDisplay({ scroll = true }: { scroll?: boolean; }) {
    const { ShowMusicNoteOnNoLyrics, TidalSyncMode: SyncMode } = settings.use(["ShowMusicNoteOnNoLyrics", "TidalSyncMode"]);
    const { lyrics, lyricRefs, currLrcIndex } = useLyrics({ scroll });
    const currentLyrics = lyrics || null;
    const NoteElement = NoteSvg(cl("music-note"));
    const position = useStateFromStores([TidalStore], () => TidalStore.mPosition);
    const makeClassName = (index: number): string => {
        if (currLrcIndex === null) return "";
        const diff = index - currLrcIndex;
        if (diff === 0) return cl("current");
        return cl(diff > 0 ? "next" : "prev");
    };

    if (!currentLyrics) {
        return ShowMusicNoteOnNoLyrics ? (
            <div className="eq-tidal-lyrics"
                onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <LyricsContextMenu />)}
            >
                <TooltipContainer text="No synced lyrics found">
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
                    <Text
                        variant={currLrcIndex === i ? "text-sm/normal" : "text-xs/normal"}
                        className={makeClassName(i)}
                    >
                        {SyncMode === "character" && line.characters && line.characters.length > 0 && line.words && line.words.length > 0 ? (
                            line.words.map((word, wIdx) => (
                                <span key={wIdx}>
                                    {word.characters.map((char, j) => {
                                        const charActive = position / 1000 >= char.time && position / 1000 < char.endTime;
                                        return (
                                            <span
                                                key={j}
                                                className={charActive ? "eq-tidal-lyrics-char-active" : "eq-tidal-lyrics-char"}
                                                style={{ opacity: charActive ? 1 : 0.5 }}
                                            >
                                                {char.char}
                                            </span>
                                        );
                                    })}
                                    {wIdx < line.words.length - 1 && <span> </span>}
                                </span>
                            ))
                        ) : SyncMode === "character" && line.characters && line.characters.length > 0 ? (
                            line.characters.map((char, j) => {
                                const charActive = position / 1000 >= char.time && position / 1000 < char.endTime;
                                return (
                                    <span
                                        key={j}
                                        className={charActive ? "eq-tidal-lyrics-char-active" : "eq-tidal-lyrics-char"}
                                        style={{ opacity: charActive ? 1 : 0.5 }}
                                    >
                                        {char.char}
                                    </span>
                                );
                            })
                        ) : SyncMode === "word" && line.words && line.words.length > 0 ? (
                            line.words.map((word, j) => {
                                const wordActive = position / 1000 >= word.time && position / 1000 < word.endTime;
                                return (
                                    <span
                                        key={j}
                                        className={wordActive ? "eq-tidal-lyrics-word-active" : "eq-tidal-lyrics-word"}
                                        style={{ opacity: wordActive ? 1 : 0.5 }}
                                    >
                                        {word.word}
                                    </span>
                                );
                            })
                        ) : (
                            line.text || NoteElement
                        )}
                    </Text>
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
