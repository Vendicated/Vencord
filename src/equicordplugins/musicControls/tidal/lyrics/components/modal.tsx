/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";

import { settings } from "../../../settings";
import { TidalStore, Track } from "../../TidalStore";
import { cl, NoteSvg, scrollClasses, useLyrics } from "./util";

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function ModalHeaderContent({ track }: { track: Track; }) {
    return (
        <ModalHeader>
            <div className={cl("header-content")}>
                {track?.imageSrc && (
                    <img
                        src={track.imageSrc}
                        alt={track.album || track.name}
                        className={cl("album-image")}
                    />
                )}
                <div>
                    <BaseText size="sm" weight="semibold">{track.name}</BaseText>
                    <BaseText size="sm">by {track.artist}</BaseText>
                    {track.album && <BaseText size="sm">on {track.album}</BaseText>}
                </div>
            </div>
        </ModalHeader>
    );
}

export function LyricsModal({ rootProps }: { rootProps: ModalProps; }) {
    const { track, lyrics, currLrcIndex } = useLyrics({ scroll: false });
    const currentLyrics = lyrics || null;
    const position = track ? TidalStore.mPosition : 0;
    const { TidalSyncMode: SyncMode } = settings.use(["TidalSyncMode"]);

    return (
        <ModalRoot {...rootProps}>
            {track && <ModalHeaderContent track={track} />}
            <ModalContent>
                <div className={cl("lyrics-modal-container") + ` ${scrollClasses.auto}`}>
                    {currentLyrics ? (
                        currentLyrics.map((line, i) => (
                            <BaseText
                                key={i}
                                size={currLrcIndex === i ? "md" : "sm"}
                                weight={currLrcIndex === i ? "semibold" : "normal"}
                                className={currLrcIndex === i ? cl("modal-line-current") : cl("modal-line")}
                            >
                                <span className={cl("modal-timestamp")}
                                    onClick={() => TidalStore.seek(line.time * 1000)}
                                >
                                    {formatTime(line.time)}
                                </span>
                                {SyncMode === "character" && line.characters && line.characters.length > 0 && line.words && line.words.length > 0 ? (
                                    line.words.map((word, wIdx) => (
                                        <span key={wIdx}>
                                            {word.characters.map((char, j) => {
                                                const charActive = position / 1000 >= char.time && position / 1000 < char.endTime;
                                                return (
                                                    <span
                                                        key={j}
                                                        className={charActive ? cl("char-active") : cl("char")}
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
                                                className={charActive ? cl("char-active") : cl("char")}
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
                                                className={wordActive ? cl("word-active") : cl("word")}
                                                style={{ opacity: wordActive ? 1 : 0.5, marginRight: 2 }}
                                            >
                                                {word.word}
                                            </span>
                                        );
                                    })
                                ) : (
                                    line.text || NoteSvg(cl("modal-note"))
                                )}
                            </BaseText>
                        ))
                    ) : (
                        <BaseText size="sm" className={cl("modal-no-lyrics")}>No lyrics available :(</BaseText>
                    )}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
