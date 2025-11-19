/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { TidalStore, Track } from "@equicordplugins/musicControls/tidal/TidalStore";
import { ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";

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
                                {line.text || NoteSvg(cl("modal-note"))}
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
